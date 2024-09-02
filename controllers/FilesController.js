import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import Queue from 'bull';
import userUtils from '../utils/user';
import fileUtils from '../utils/file';
import basicUtils from '../utils/basic';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const fileQueue = new Queue('fileQueue');

class FilesController {
    /**
     * Creates a new file in DB and in disk
     *
     * @param {Object} request - Express request object
     * @param {Object} response - Express response object
     */
    static async postUpload(request, response) {
        const { userId } = await userUtils.getUserIdAndKey(request);

        if (!basicUtils.isValidId(userId)) {
            return response.status(401).send({ error: 'Unauthorized' });
        }
        if (!userId && request.body.type === 'image') {
            await fileQueue.add({});
        }

        const user = await userUtils.getUser({
            _id: ObjectId(userId),
        });

        if (!user) return response.status(401).send({ error: 'Unauthorized' });

        const { error: validationError, fileParams } = await fileUtils.validateBody(
            request,
        );

        if (validationError) { return response.status(400).send({ error: validationError }); }

        if (fileParams.parentId !== 0 && !basicUtils.isValidId(fileParams.parentId)) { return response.status(400).send({ error: 'Parent not found' }); }

        const { error, code, newFile } = await fileUtils.saveFile(
            userId,
            fileParams,
            FOLDER_PATH,
        );

        if (error) {
            if (response.body.type === 'image') await fileQueue.add({ userId });
            return response.status(code).send(error);
        }

        if (fileParams.type === 'image') {
            await fileQueue.add({
                fileId: newFile.id.toString(),
                userId: newFile.userId.toString(),
            });
        }

        return response.status(201).send(newFile);
    }

    /**
     * Retrieves the file document based on the ID
     *
     * @param {Object} request - Express request object
     * @param {Object} response - Express response object
     */
    static async getShow(request, response) {
        const fileId = request.params.id;

        const { userId } = await userUtils.getUserIdAndKey(request);

        const user = await userUtils.getUser({
            _id: ObjectId(userId),
        });

        if (!user) return response.status(401).send({ error: 'Unauthorized' });

        // Mongo Condition for Id
        if (!basicUtils.isValidId(fileId) || !basicUtils.isValidId(userId)) { return response.status(404).send({ error: 'Not found' }); }

        const result = await fileUtils.getFile({
            _id: ObjectId(fileId),
            userId: ObjectId(userId),
        });

        if (!result) return response.status(404).send({ error: 'Not found' });

        const file = fileUtils.processFile(result);

        return response.status(200).send(file);
    }

    /**
     * Retrieves all users file documents for a specific
     * parentId and with pagination
     *
     * @param {Object} request - Express request object
     * @param {Object} response - Express response object
     */
    static async getIndex(request, response) {
        const { userId } = await userUtils.getUserIdAndKey(request);

        const user = await userUtils.getUser({
            _id: ObjectId(userId),
        });

        if (!user) return response.status(401).send({ error: 'Unauthorized' });

        let parentId = request.query.parentId || '0';

        if (parentId === '0') parentId = 0;

        let page = Number(request.query.page) || 0;

        if (Number.isNaN(page)) page = 0;

        if (parentId !== 0 && parentId !== '0') {
            if (!basicUtils.isValidId(parentId)) { return response.status(401).send({ error: 'Unauthorized' }); }

            parentId = ObjectId(parentId);

            const folder = await fileUtils.getFile({
                _id: ObjectId(parentId),
            });

            if (!folder || folder.type !== 'folder') { return response.status(200).send([]); }
        }

        const pipeline = [
            { $match: { parentId } },
            { $skip: page * 20 },
            {
                $limit: 20,
            },
        ];

        const fileCursor = await fileUtils.getFilesOfParentId(pipeline);

        const fileList = [];
        await fileCursor.forEach((doc) => {
            const document = fileUtils.processFile(doc);
            fileList.push(document);
        });

        return response.status(200).send(fileList);
    }

    /**
     * Sets isPublic to true on the file document based on the ID
     *
     * @param {Object} request - Express request object
     * @param {Object} response - Express response object
     */
    static async putPublish(request, response) {
        const { error, code, updatedFile } = await fileUtils.publishUnpublish(
            request,
            true,
        );

        if (error) return response.status(code).send({ error });

        return response.status(code).send(updatedFile);
    }

    /**
     * Sets isPublic to false on the file document based on the ID
     *
     * @param {Object} request - Express request object
     * @param {Object} response - Express response object
     */
    static async putUnpublish(request, response) {
        const { error, code, updatedFile } = await fileUtils.publishUnpublish(
            request,
            false,
        );

        if (error) return response.status(code).send({ error });

        return response.status(code).send(updatedFile);
    }

    /**
     * Returns the content of the file document based on the ID
     *
     * @param {Object} request - Express request object
     * @param {Object} response - Express response object
     */
    static async getFile(request, response) {
        const { userId } = await userUtils.getUserIdAndKey(request);
        const { id: fileId } = request.params;
        const size = request.query.size || 0;

        // Mongo Condition for Id
        if (!basicUtils.isValidId(fileId)) { return response.status(404).send({ error: 'Not found' }); }

        const file = await fileUtils.getFile({
            _id: ObjectId(fileId),
        });

        if (!file || !fileUtils.isOwnerAndPublic(file, userId)) { return response.status(404).send({ error: 'Not found' }); }

        if (file.type === 'folder') {
            return response
                .status(400)
                .send({ error: "A folder doesn't have content" });
        }

        const { error, code, data } = await fileUtils.getFileData(file, size);

        if (error) return response.status(code).send({ error });

        const mimeType = mime.contentType(file.name);

        response.setHeader('Content-Type', mimeType);

        return response.status(200).send(data);
    }
}

export default FilesController;
