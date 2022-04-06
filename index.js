const fs = require('fs')
const https = require('https')
const http = require('http')
const path = require('path')
const axios = require('axios').default
const extract = require('extract-zip')
const express = require('express')
const IPFS = require('ipfs')
const ipfsClient = require('ipfs-http-client')
const Ctl = require('ipfsd-ctl')


async function downloadPrivate(url, token, dest) {
    return new Promise((resolve, reject) => {
        axios({
            method: 'get',
            url,
            responseType: 'stream',
            headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json'
            }
        })
            .then(function (response) {
                const file = fs.createWriteStream(dest)
                file.on('finish', () => resolve('Done'))
                file.on('error', err => {
                    file.close()
                    console.log(err.message)
                    fs.unlink(dest, () => reject('Error'))
                })
                response.data.pipe(file)
                console.log('Download complete')
            })
            .catch(function (error) {
                if (error.response) {
                    console.log(error.response.data);
                    console.log(error.response.status);
                    console.log(error.response.headers);
                } else if (error.request) {
                    console.log(error.request);
                } else {
                    console.log('Error', error.message);
                }
                console.log(error.config);
                reject('Error')
            })
    })
}

async function extractZip(source, target) {
    if (fs.existsSync(source)) {
        if (fs.existsSync(target)) {
            try {
                fs.rmdirSync(target, { recursive: true })
            } catch (error) {
                console.log(error.message)
            }
        }
        try {
            await extract(source, { dir: target })
            console.log('Extraction complete')
        } catch (err) {
            console.log(err)
        }
    } else {
        console.log('File doesn\'t exist')
    }
}

async function startIPFSdaemon() {
    const ipfsd = await Ctl.createController({
        type: 'js',
        test: false,
        disposable: false,
        ipfsHttpModule: require('ipfs-http-client'),
        ipfsBin: require('ipfs').path(),
    })
    await ipfsd.start()
    console.log(await ipfsd.api.id())
    console.log(await ipfsd.apiAddr.inspect())
    console.log(await ipfsd.gatewayAddr.inspect())

    process.on('beforeExit', async () => {
        await ipfsd.stop()
        console.log(ipfsd.started.toString())
        process.exit()
    })
    process.stdin.resume();
    process.on('SIGINT', async () => {
        await ipfsd.stop()
        console.log(ipfsd.started.toString())
        process.exit()
    })

    if (ipfsd.started == true)
        return ipfsd.apiAddr.toString()
    else
        console.log('Cannot start IPFS daemon')
        process.exit(1)
}

async function uploadipfs(filesPath) {
    const ipfsDaemon = await startIPFSdaemon()
    const ipfs = await ipfsClient.create(ipfsDaemon)
    logger = fs.createWriteStream('log.txt')
    for await (const file of ipfs.addAll(IPFS.globSource(filesPath, '*/**'))) {
        console.log(file)
        const checkfile = fs.lstatSync(path.resolve(filesPath + '/' + file.path))
        if (checkfile.isFile() == true) {
            ipfs.files.write('/docsify/' + file.path, path.resolve(filesPath + '/' + file.path), {
                create: true,
                parents: true
            })
        }
        logger.write(file.path + ' https://ipfs.io/ipfs/' + file.cid + '\r\n')
    }
    logger.close()
    console.log('IPFS upload completed')
}

// Define file name and dir
const zipFilename = './main.zip'
const destDir = './docsify'
// Define the GitHub private repo source and API token
const privateRepo = 'https://api.github.com/repos/henryijs/ijsdocsify-private/zipball/main'
const accessToken = 'yourtokenhere'

// Download latest archive from GitHub
downloadPrivate(privateRepo, accessToken, path.resolve(zipFilename)).then((res) => {
    // Extract the downloaded archive
    extractZip(path.resolve(zipFilename), path.resolve(destDir)).then((res) => {
        // Use Express to serve HTTP for docsify
        const app = express()
        // Define path and SSL options
        const extractedFolder = fs.readdirSync(path.resolve('docsify'))
        const httpPath = 'docsify/' + extractedFolder[extractedFolder.length - 1] + '/docs'
        const httpsOptions = {
            key: fs.readFileSync('ssl/private.key'),
            cert: fs.readFileSync('ssl/certificate.crt')
        };

        app.use(express.static(path.resolve(httpPath)))
        http.createServer(app).listen(80)
        https.createServer(httpsOptions, app).listen(443, () => {
            console.log('Express app listening at https://localhost')
        })
        uploadipfs(path.resolve('docsify/' + extractedFolder[extractedFolder.length - 1]))
    })
})
