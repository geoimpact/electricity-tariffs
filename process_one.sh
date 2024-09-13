#!/bin/bash

docker run --rm -v $(pwd):/usr/src/app -w /usr/src/app --user $(id -u):$(id -g) ghcr.io/puppeteer/puppeteer:23.2.2 node --env-file=./scraper/.env ./scraper/dist/src/single-run.js --schema-dir ./schema --output-dir ./output --database-dir ./database --elcom-numbers-json="[$1]" --prompt-file=./prompts/final.txt --output-file=./output/$1/harmonized_$1.json

