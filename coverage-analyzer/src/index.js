import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { readFile } from 'fs/promises';
import {writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function flattenObject(obj, parent = '', res = {}) {
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            let propName = parent ? parent + '.' + key : key;
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                flattenObject(obj[key], propName, res);
            } else {
                res[propName] = obj[key];
            }
        }
    }
    return res;
}

/**
 * Recursively lists all files in a directory.
 * @param {string} dir - The directory to start the search.
 * @param {RegExp} regex - The regular expression to filter the file paths.
 * @returns {string[]} - A list of file paths that match the regex.
 */
function listFilesRecursive(dir, regex) {
    let results = [];

    const listFiles = (currentDir) => {
        const files = fs.readdirSync(currentDir);

        files.forEach((file) => {
            const filePath = path.join(currentDir, file);
            const stat = fs.statSync(filePath);

            if (stat && stat.isDirectory()) {
                listFiles(filePath);
            } else {
                if (regex.test(filePath)) {
                    results.push(filePath);
                }
            }
        });
    };

    let dirToScan = null;
    if(path.isAbsolute(dir)){
        dirToScan = path.resolve(`${dir}`);
    } else {
        dirToScan = path.resolve(`${process.cwd()}/${dir}`);
    }
    console.log(`Scanning ${dirToScan.toString()}`)
    listFiles(dirToScan);
    return results;
}

// Parse arguments using yargs
const argv = yargs(hideBin(process.argv))
    .option('directory', {
        alias: 'd',
        type: 'string',
        description: 'The directory to search for files',
        demandOption: true
    })
    .option('pattern', {
        alias: 'p',
        type: 'string',
        description: 'The regex pattern to filter files (e.g. output_\\d+\\.json)',
        demandOption: true
    })
    .help()
    .alias('help', 'h')
    .argv;

const directoryToSearch = argv.directory;
const regexPattern = argv.pattern;

async function analyzeFiles(filePaths) {
    const statistics = {
        countProcessed: 0,
        countInvalid: 0,
        properties: {}
    };
    for(let i = 0; i < filePaths.length; i++) {
        let filePath = filePaths[i];
        // Read the file asynchronously
        const jsonData = await readFile(filePath, 'utf-8');
        // Parse the JSON data
        try {
            const parsedData = JSON.parse(jsonData);
            const parsedDataFlat = flattenObject(parsedData);
            Object.keys(parsedDataFlat).forEach(key => {
                if(statistics.properties[key] === undefined) {
                    statistics.properties[key] = [];
                } else {
                    statistics.properties[key].push(parsedDataFlat[key])
                }
            })
        } catch (e){
            statistics.countInvalid+=1;
        }

        // calculate the statistics and generate the coverage report
        statistics.countProcessed+=1;
    }
    return statistics;
}

try {
    // Convert string regex to a real RegExp object
    const regex = new RegExp(regexPattern);

    // Get the list of files that match the regex
    const filteredFiles = listFilesRecursive(directoryToSearch, regex);

    // Output the filtered file paths
    console.log('Filtered files:', filteredFiles);
    let coverageReport = await analyzeFiles(filteredFiles);
    const outputPath = path.resolve(`${__dirname}/../output/coverage-statistics.json`);
    console.log(`Coverage report ready to be written to disk on ${outputPath.toString()}.`);
    // Ensure directory exists using fs.mkdirSync with recursive option
    await writeFileSync(outputPath, JSON.stringify(coverageReport, null, 2));
} catch (error) {
    console.error('Error:', error.message);
}
