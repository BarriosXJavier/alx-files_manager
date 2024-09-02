import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
    /**
     * Get the status of the API
     *
     * @param {Object} request - Express request object
     * @param {Object} response - Express response object
     *
     * @returns {Object} API status
     */
    static getStatus(request, response) {
        const status = {
            redis: redisClient.isAlive(),
            db: dbClient.isAlive(),
        };
        response.status(200).send(status);
    }

    /**
     * Get the number of users and files in the database
     *
     * @param {Object} request - Express request object
     * @param {Object} response - Express response object
     *
     * @returns {Object} Number of users and files
     */
    static async getStats(request, response) {
        const stats = {
            users: await dbClient.nbUsers(),
            files: await dbClient.nbFiles(),
        };
        response.status(200).send(stats);
    }
}

export default AppController;
