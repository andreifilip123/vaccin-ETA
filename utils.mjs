import fs from 'fs';
import fetch from 'node-fetch';

export const downloadFile = async (url, path) => {
    const res = await fetch(url);
    const fileStream = fs.createWriteStream(path);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", reject);
        fileStream.on("finish", resolve);
    });
};

export const setValueDeep = (object, path, value) => {
    const parts = path.split('§');
    let currObject = object

    while (parts.length > 1) {
        if (!currObject[parts[0]])
            currObject[parts[0]] = {}
        currObject = currObject[parts[0]];
        parts.shift();
    }

    currObject[parts[0]] = value;
}