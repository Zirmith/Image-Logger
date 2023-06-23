const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const uuidv4 = require('uuid').v4
const getmac = require('getmac')
const request = require('request-promise-native');
const axios = require('axios');
//Syn@#!133(Imager

require('dotenv').config()
app.use(cors())
app.use(bodyParser.json())

const description = [[    "This is a simple image tracker for educational purposes, and will be used as a example of how to encrypt a image, and be able to get infomation and send it to a webhook"]]

const syn_config = {
    apiname: "Syn_Imager",
    preendpoint: "/host/image/",
    creator: "user"
}

const images = {}

app.post(syn_config.preendpoint + 'encrypt', async (req, res) => {
  // fetch and encrypt the image from the provided URL, and save it to the server
  const imageUrl = req.body.imageUrl;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  try {
    const imageBuffer = await request.get(imageUrl, { encoding: null });

    // Add a red thin border to the image
    const sharp = require('sharp');
    const borderSize = 5;
    const borderColor = '#FF0000';
    const borderedImageBuffer = await sharp(imageBuffer)
      .extend({
        top: borderSize,
        bottom: borderSize,
        left: borderSize,
        right: borderSize,
        background: borderColor
      })
      .toBuffer();

    const id = uuidv4();
    const encryptedImage = encryptImage(borderedImageBuffer);
    images[id] = {
      encryptedImage,
      clicks: 0,
      // ip, // store the user's IP address in the object
      // userId: uuidv4() // generate a new unique identifier for the user
    }

    const imageURL = syn_config.preendpoint + 'content/raw/' + id;
    console.log(`New Image Hooked Track it here: ${syn_config.preendpoint + "content/tracking/"+id}`);
    const trackinglink = `${syn_config.preendpoint}content/tracking/` + id;
    res.status(200).send({ imageURL, trackinglink, id });
  } catch (err) {
    console.error(err);
    res.status(400).send({ error: 'Error fetching or encrypting image' });
  }
});


app.get(syn_config.preendpoint + 'content/tracking/:id', (req, res) => {
  const id = req.params.id;
  if (images[id]) {
    const clicks = images[id].clicks;
    const tracking = images[id].tracking || [];
    const title = `ZImage-Hosting Tracking - Image ${id}`;
  // Modify this line to exclude the tracking information
  const description = `This image has been viewed. Tracking information: ${JSON.stringify(tracking)}`;
    // Generate HTML response with meta tags and dark background
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="robots" content="noindex, nofollow" />
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="https://zimagehosting.onrender.com/host/image/content/raw/${id}" />
          <meta http-equiv="refresh" content="10" />
          <title>${title}</title>
          <style>
            body {
              background-color: #000;
              background-image: linear-gradient(to right, #2d4eff33, #8220ff33);
              color: #fff;
              font-weight: bold;
              text-align: center;
            }
            table {
              margin: 0 auto;
            }
            td {
              padding: 5px;
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <tr>
              <td>Clicks:</td>
              <td>${clicks}</td>
            </tr>
            <tr>
              <td>Last updated:</td>
              <td>${new Date().toLocaleString()}</td>
            </tr>
            <tr>
              <td>Tracking information:</td>
              <td>${JSON.stringify(tracking)}</td>
            </tr>
          </table>
        </body>
      </html>
    `;
    
    // Send the HTML response
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } else {
    // Generate HTML response for image not found
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content="ZImage-Hosting Tracking - Invalid" />
        <meta property="og:description" content="This image could not be found in our database" />
        <meta property="og:image" content="http://example.com/image.jpg" />
          <title>Image Not Found</title>
          <style>
            body {
              background-color: #000;
              color: #fff;
              font-weight: bold;
              text-align: center;
            }
          </style>
        </head>
        <body>
        <p>Sorry, the image you requested could not be found.</p>
        <p>Please check the URL</a>.</p>
        </body>
      </html>
    `;
    
    // Send the HTML response
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/html');
    res.status(404).send(html);
  }
});


app.get(syn_config.preendpoint + 'content/raw/:id', async (req, res) => {
  const id = req.params.id;
  if (images[id]) {
    // Decrypt the encrypted image data
    const decryptedBuffer = await decryptImage(images[id].encryptedImage);

    // Set the appropriate content type based on the image file extension
    res.setHeader('Content-Type', 'image/png');

    // Send the decrypted image data
    res.send(decryptedBuffer);
  } else {
    res.status(404).send('Image not found');
  }
});



app.get("/", (req, res) => {
  res.send('Hello, world')
})




async function decryptImage(encryptedDataPromise) {
    // Wait for the promise to resolve and get the encrypted data
    const encryptedData = await encryptedDataPromise;
  
    // Decrypt the image using your decryption algorithm
    // This is just a placeholder
    const decryptedData = Buffer.from(encryptedData, 'base64');
    return decryptedData;
  }
  
  

async function encryptImage(image) {
    // If the image is a URL, fetch the image from the URL
    if (typeof image === 'string' && image.startsWith('https')) {
      const response = await axios.get(image, { responseType: 'arraybuffer' });
      image = response.data;
    }
  
    // Encrypt the image using your encryption algorithm
    // This is just a placeholder
    const encryptedData = image.toString('base64');
    return encryptedData;
  }
  



app.listen(3009, () => {
  console.log(`listening on 3009`)
})
