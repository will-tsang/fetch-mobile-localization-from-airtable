#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

const config = require('./config.json');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseKey = process.env.BASE_KEY;
const targetPlatform = process.env.TARGET_PLATFORM;

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
    const tableName = config.platform[targetPlatform].table;
    const { languages } = config.platform[targetPlatform];
    const fields = Object.values(languages).concat('key');
    const records = await getRecords(tableName, fields);

    return Object.entries(languages)
        .map(([language, columnName]) => {
            const result = records.reduce((acc, cur) => {

                const path = cur.key;
                let value = cur[columnName] || '';

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
    const tableName = config.platform[targetPlatform].table;
    const { languages } = config.platform[targetPlatform];
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
                    
                return acc.concat('"', path, '"="', value, '";', '\n');
            }, `/* ${columnName} */\n`);

            return {
                language,
                result,
            };
        });
}

const writeToFiles = async () => {
    if(targetPlatform === 'iOS') {
        const translation = await transformIOS();
        const targetPath = process.env.FILES_PATH;

        translation.forEach(({ language, result }) => {
            const dir = `${targetPath}/${language}.lproj`;
            const file = decodeURIComponent(`${dir}/Localizable.strings`);

            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            fs.writeFile(file, result, (err) => {
                if (err) throw err;
                console.log(`${file} updated`);
            });
        });
    } else if (targetPlatform === 'watch') {
        const translation = await transformAndroid();
        const targetPath = process.env.WATCH_FILES_PATH;

        translation.forEach(({ language, result }) => {
            const dir = `${targetPath}/${language}`;
            const file = `${dir}/strings.xml`;

            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            fs.writeFile(file, result, (err) => {
                if (err) throw err;
                console.log(`${file} updated`);
            });
        });
    }
}

writeToFiles();
