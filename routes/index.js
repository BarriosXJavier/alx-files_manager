import express from 'express';
import AuthController from '../controllers/AuthController';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import FilesController from '../controllers/FilesController';

function controllerRouting(app) {
    const router = express.Router();
    app.use('/', router);

    // Check if redis is alive
    router.get('/status', (req, res) => {
        AppController.getStatus(req, res);
    });

    // return the number of users and files in DB
    router.get('/stats', (req, res) => {
        AppController.getStats(req, res);
    });

    // User Controller

    // create a new user in DB
    router.post('/users', (req, res) => {
        UsersController.postNew(req, res);
    });

    // retrieve the user base on the token used
    router.get('/users/me', (req, res) => {
        UsersController.getMe(req, res);
    });

    // Auth

    //sign-in the user by generating a new authentication token
    router.get('/connect', (req, res) => {
        AuthController.getConnect(req, res);
    });

    // sign-out the user based on the token
    router.get('/disconnect', (req, res) => {
        AuthController.getDisconnect(req, res);
    });

    // Files Controller

    //create a new file in DB and in disk
    router.post('/files', (req, res) => {
        FilesController.postUpload(req, res);
    });

    // retrieve the file document based on the ID
    router.get('/files/:id', (req, res) => {
        FilesController.getShow(req, res);
    });

    // retrieve all users file documents for a
    // specific parentId and with pagination
    router.get('/files', (req, res) => {
        FilesController.getIndex(req, res);
    });

    // set isPublic to true on the file document based on the ID
    router.put('/files/:id/publish', (req, res) => {
        FilesController.putPublish(req, res);
    });

    // set isPublic to false on the file document based on the ID
    router.put('/files/:id/unpublish', (req, res) => {
        FilesController.putUnpublish(req, res);
    });

    // return the content of the file document based on the ID
    router.get('/files/:id/data', (req, res) => {
        FilesController.getFile(req, res);
    });
}

export default controllerRouting;