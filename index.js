const fs = require('fs')
const https = require('https')
const http = require('http')
const path = require("path")
const extract = require('extract-zip')
const express = require('express')

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, response => {
            if (response.statusCode === 200) {
                const file = fs.createWriteStream(dest)
                file.on('finish', () => resolve())
                file.on('error', err => {
                    file.close()
                    if (err.code === 'EEXIST') reject('File already exists')
                    else fs.unlink(dest, () => reject(err.message)) // Delete temp file
                })
                response.pipe(file)
                console.log('Download complete')
            } else if (response.statusCode === 302 || response.statusCode === 301) {
                //Recursively follow redirects, only a 200 will resolve.
                download(response.headers.location, dest).then(() => resolve())
            } else {
                reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`)
            }
        })
        request.on('error', err => {
            reject(err.message)
        })
    })
}

async function extractZip(source, target) {
    try {
        await extract(source, { dir: target })
        console.log('Extraction complete')
    } catch (err) {
        console.log(err)
    }
}

// Define the GitHub repo source
const url = 'https://codeload.github.com/henryijs/ijsdocsify/zip/refs/heads/main'
const zipFilename = './main.zip'
const destDir = './docsify'

// Download latest archive from GitHub
download(url, path.resolve(zipFilename)).then((response) => {
    // Extract the downloaded archive
    extractZip(path.resolve(zipFilename), path.resolve(destDir))
})

// Use Express to serve HTTP for docsify
const app = express()
// Define HTTP port and path
const port = 8080
const httpPath = 'docsify/ijsdocsify-main/docs'

app.use(express.static(path.resolve(httpPath)))
app.listen(port, () => {
    console.log('Express app listening at http://localhost:' + port)
})
