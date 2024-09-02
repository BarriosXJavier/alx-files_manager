import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import redisClient from '../utils/redis';
import userUtils from '../utils/user';

class AuthController {
    /**
     * Sign in user and generate new authentication token
     * @param {Object} request - Express request object
     * @param {Object} response - Express response object
     * @return {Promise} - Promise resolving to the new user with only the email and the id
     */
    static async getConnect(request, response) {
        const Authorization = request.header('Authorization') || '';

        if (!Authorization) {
            return response.status(401).send({ error: 'Unauthorized' });
        }

        const [email, password] = Buffer.from(Authorization.split(' ')[1], 'base64')
            .toString('utf-8')
            .split(':');

        if (!email || !password) {
            return response.status(401).send({ error: 'Unauthorized' });
        }

        const user = await userUtils.getUser({ email, password: sha1(password) });

        if (!user) {
            return response.status(401).send({ error: 'Unauthorized' });
        }

        const token = uuidv4();
        const key = `auth_${token}`;
        const hoursForExpiration = 24;

        await redisClient.set(key, user._id.toString(), hoursForExpiration * 3600);

        return response.status(200).send({ token });
    }

    /**
     * Sign out user based on the token
     * @param {Object} request - Express request object
     * @param {Object} response - Express response object
     * @return {Promise} - Promise resolving to nothing
     */
    static async getDisconnect(request, response) {
        const { userId, key } = await userUtils.getUserIdAndKey(request);

        if (!userId) {
            return response.status(401).send({ error: 'Unauthorized' });
        }

        redisClient.del(key);

        return response.status(204).send();
    }
}

export default AuthController;
