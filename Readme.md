## Running Puppeteer on Docker

### Puppeteer

### Building Image

```sh
docker build -t puppeteer-chrome-linux -f Dockerfile-puppeteer .
```

### Running puppeteer

```sh
docker run --env-file .env puppeteer-chrome-linux
```
