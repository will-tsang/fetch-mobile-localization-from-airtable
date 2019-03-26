#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const os = require('os')

const config = require('./config.json');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseKey = process.env.BASE_KEY;
const project = process.env.PROJECT;

const getRecords = async (tableName, fields) => {
    const baseUrl = `${config.baseUrl}${baseKey}/${encodeURIComponent(tableName)}`;

    let previousOffset;
    let results = [];
    do {
        const { data: { records, offset } } = await axios.get(baseUrl, {
            params: {
                fields,
                offset: previousOffset,
                view: 'Grid view',
            },
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
        results = results.concat(records);
        previousOffset = offset;
    } while (previousOffset);

    return results.map(result => result.fields);
}

const transformAndroid = async () => {
    const { languages, table: tableName } = config.projects[project];
    const fields = Object.values(languages).concat('key');
    const records = await getRecords(tableName, fields);

    return Object.entries(languages)
        .map(([language, columnName]) => {
            const result = records.reduce((acc, cur) => {

                const path = cur.key;
                let value = cur[columnName];

                if (!path) {
                    return acc.concat('\n');
                }
                if (path.startsWith('<!--') && path.endsWith('-->')) {
                    return acc.concat('    ', path, '\n');
                }
                if (!value) {
                    return acc;
                }
                    
                return acc.concat('    <string name="', path, '">', value, '</string>', '\n');
            }, '<resources>\n').concat('</resources>\n');

            return {
                language,
                result,
            };
        });
}


const transformIOS = async () => {
    const { languages, table: tableName } = config.projects[project];
    const fields = Object.values(languages).concat('key');
    const records = await getRecords(tableName, fields);

    return Object.entries(languages)
        .map(([language, columnName]) => {
            const result = records.reduce((acc, cur) => {
                const path = cur.key;
                let value = cur[columnName];

                if (!path) {
                    return acc.concat('\n');
                }
                if (path.startsWith('//') || (path.startsWith('/*') && path.endsWith('*/'))) {
                    return acc.concat(path, '\n');
                }
                if (!value) {
                    return acc;
                } 
                    
                return acc.concat(JSON.stringify(path), '=', JSON.stringify(value), ';', '\n');
            }, `/* ${columnName} */\n`);

            return {
                language,
                result,
            };
        });
}

const fetchLocale = async () => {
    const { platform, localPath } = config.projects[project];
    const targetPath = os.homedir().concat(localPath);

    switch(platform) {
        case 'iOS': {
            const translation = await transformIOS();
            translation.forEach(({ language, result }) => {
                const dir = `${targetPath}/${language}.lproj`;
                const file = `${dir}/Localizable.strings`;

                writeToFiles(dir, file, result);
            });
            break;
        }
        
        case 'Android': {
            const translation = await transformAndroid();
            translation.forEach(({ language, result }) => {
                const dir = `${targetPath}/${language}`;
                const file = `${dir}/strings.xml`;

                writeToFiles(dir, file, result);
            });
            break;
        }
    }
}

const writeToFiles = async (dir, file, result) => {
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    fs.writeFile(file, result, (err) => {
        if (err) throw err;
        console.log(`${file} updated`);
    });
}

fetchLocale();
