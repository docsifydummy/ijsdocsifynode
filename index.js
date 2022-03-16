const fs = require('fs')
const https = require('https')
const http = require('http')
const path = require('path')
const axios = require('axios').default
const extract = require('extract-zip')
const express = require('express')

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
    if (fs.existsSync(source))
        try {
            await extract(source, { dir: target })
            console.log('Extraction complete')
        } catch (err) {
            console.log(err)
        }
        else {
            console.log('File doesn\'t exist')
        }
}

// Define file name and dir
const zipFilename = './main.zip'
const destDir = './docsify'
// Define the GitHub private repo source and API token
const privateRepo = 'https://api.github.com/repos/henryijs/ijsdocsify-private/zipball/main'
const accessToken = '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'

// Download latest archive from GitHub
downloadPrivate(privateRepo, accessToken, path.resolve(zipFilename)).then((res) => {
    // Extract the downloaded archive
    extractZip(path.resolve(zipFilename), path.resolve(destDir)).then((res) => {
        // Use Express to serve HTTP for docsify
        const app = express()
        // Define path and SSL options
        const extractedFolder = fs.readdirSync(path.resolve('docsify'))
        const httpPath = 'docsify/' + extractedFolder[0] + '/docs'
        const httpsOptions = {
            key: fs.readFileSync('ssl/private.key'),
            cert: fs.readFileSync('ssl/certificate.crt')
        };

        app.use(express.static(path.resolve(httpPath)))
        http.createServer(app).listen(80)
        https.createServer(httpsOptions, app).listen(443, () => {
            console.log('Express app listening at https://localhost')
        })
    })
})
