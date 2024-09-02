import { expect, use, should } from 'chai';
import chaiHttp from 'chai-http';
import { promisify } from 'util';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

use(chaiHttp);
should();

describe('testing the clients for MongoDB and Redis', () => {
    describe('redis Client', () => {
        before(async () => {
            await redisClient.client.flushall('ASYNC');
        });

        after(async () => {
            await redisClient.client.flushall('ASYNC');
        });

        it('shows that connection is alive', async () => {
            expect(await redisClient.isAlive()).to.equal(true);
        });

        it('returns key as null because it does not exist', async () => {
            expect(await redisClient.get('myKey')).to.be.null;
        });

        it('set key can be called without issue', async () => {
            expect(await redisClient.set('myKey', 12, 1)).to.be.undefined;
        });

        it('returns key with null because it expired', async () => {
            const sleep = promisify(setTimeout);
            await sleep(1100);
            expect(await redisClient.get('myKey')).to.be.null;
        });
    });

    // dbClient
    describe('db Client', () => {
        beforeEach(async () => {
            await dbClient.usersCollection.deleteMany({});
            await dbClient.filesCollection.deleteMany({});
        });

        afterEach(async () => {
            await dbClient.usersCollection.deleteMany({});
            await dbClient.filesCollection.deleteMany({});
        });

        it('shows that connection is alive', async () => {
            expect(await dbClient.isAlive()).to.equal(true);
        });

        it('shows number of user documents', async () => {
            expect(await dbClient.nbUsers()).to.equal(0);

            await dbClient.usersCollection.insertOne({ name: 'Jane' });
            await dbClient.usersCollection.insertOne({ name: 'Doe' });
            expect(await dbClient.nbUsers()).to.equal(2);
        });

        it('shows number of file documents', async () => {
            expect(await dbClient.nbFiles()).to.equal(0);

            await dbClient.filesCollection.insertOne({ name: 'FileOne' });
            await dbClient.filesCollection.insertOne({ name: 'FileTwo' });
            expect(await dbClient.nbFiles()).to.equal(2);
        });
    });
});
