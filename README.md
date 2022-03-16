# ijsdocsifynode
 
### Functions

- Download archive from GitHub private repo by API token
- Extract the source files of Docsify
- Serve Docsify contents with Express HTTP

## Dependencies

- axois
- extract-zip
- express

## How to run

1. Place SSL cert and key files to ssl/ folder, rename them to `certificate.crt` and `private.key`
2. Input your private repo API URL and API token on `index.js`
3. `$ npm run test` or `$ node ./index.js`
