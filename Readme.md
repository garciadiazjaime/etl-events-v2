## Running Puppeteer on Docker

### Building Image

```sh
docker build . --no-cache -t puppeteer-chrome-linux -f Dockerfile-puppeteer
```

### Running puppeteer

```sh
docker run -v /home/jgarcia/config/data:/home/pptruser/data puppeteer-chrome-linux
```
