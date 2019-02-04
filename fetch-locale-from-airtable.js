#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

const config = require('./config.json');

const apiKey = process.env.AIRTABLE_API_KEY;
const baseKey = process.env.BASE_KEY;
const targetTable = process.env.TARGET_TABLE;
const iOSProjectDir = process.env.IOS_FILES_PATH;

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

const transform = async () => {
    const tableName = config.tables[targetTable];
    const { languages } = config;
    const fields = Object.values(config.languages).concat('key');
    const records = await getRecords(tableName, fields);

    return Object.entries(languages)
        .map(([language, columnName]) => {
            const result = records.reduce((acc, cur) => {
                const path = cur.key;
                let value = cur[columnName] || '';

                if (!path) {
                    return acc.concat('\n');
                }
                if (path.startsWith('//') || (path.startsWith('/*') && path.endsWith('*/'))) {
                    return acc.concat(path, '\n');
                } else {
                    if(targetTable === 'iOS') {
                        return acc.concat('"', path, '"="', value, '";', '\n');
                    } else {
                        return acc;
                    }
                }
            }, `/* ${columnName} */\n`);

            return {
                language,
                result,
                targetTable,
            };
        });
}

const writeToFiles = async () => {
    const translation = await transform();
    translation.forEach(({ language, targetTable, result }) => {
        var dir = '';
        var file = '';

        if (targetTable === 'iOS') {
            if (!iOSProjectDir) {
                return;
            }
            
            dir = `${iOSProjectDir}/${language}.lproj`;
            file = decodeURIComponent(`${dir}/Localizable.strings`);
        } else {
            return;
        }

        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        fs.writeFile(file, result, (err) => {
            if (err) throw err;
            console.log(`${file} updated`);
        });
    });
}

writeToFiles();