import S3 from 'aws-sdk/clients/s3.js';
import { makeid } from './utils.js';

const s3 = new S3({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    signatureVersion: 'v4'
});

export async function uploadUrl() {
    let imageName = makeid(32);

    const imageParams = ({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: imageName,
        Expires: 60
    });

    const uploadURL = await s3.getSignedUrlPromise('putObject', imageParams);
    /*
    const url = uploadURL.split("?")[0];
    return url;
    */
    return uploadURL;
}

// url = uploadUrl.split("?")[0];
// url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/imageName`

export async function deleteUrl(url) {
    const imageName = url.split("/")[3];
    await s3.deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: imageName
    }).promise();
}
