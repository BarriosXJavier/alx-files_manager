import Queue from 'bull';
import { ObjectId } from 'mongodb';
import { promises as fsPromises } from 'fs';
import fileUtils from './utils/file';
import userUtils from './utils/user';
import basicUtils from './utils/basic';

const imageThumbnail = require('image-thumbnail');

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

fileQueue.process(async ({ data: { fileId, userId } }) => {
    if (!basicUtils.isValidId(fileId) || !basicUtils.isValidId(userId)) {
        throw new Error('File or user not found');
    }

    const file = await fileUtils.getFile({ _id: ObjectId(fileId), userId: ObjectId(userId) });

    if (!file) {
        throw new Error('File not found');
    }

    const { localPath } = file;
    const widths = [500, 250, 100];

    widths.forEach(async (width) => {
        try {
            const thumbnail = await imageThumbnail(localPath, { width });
            await fsPromises.writeFile(`${localPath}_${width}`, thumbnail);
        } catch (err) {
            console.error(err.message);
        }
    });
});

userQueue.process(async ({ data: { userId } }) => {
    if (!basicUtils.isValidId(userId)) {
        throw new Error('User not found');
    }

    const user = await userUtils.getUser({ _id: ObjectId(userId) });

    if (!user) {
        throw new Error('User not found');
    }

    console.log(`Welcome ${user.email}!`);
});
