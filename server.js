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

const images = {};

app.post(syn_config.preendpoint + 'encrypt', async (req, res) => {
  const imageUrl = req.body.imageUrl;

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
    const encryptedImage = await encryptImage(borderedImageBuffer);
    images[id] = {
      encryptedImage,
      clicks: 0,
      tracking: [] // Initialize an empty tracking array
    };

    const imageURL = syn_config.preendpoint + 'content/raw/' + id;
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
    const { clicks, tracking } = images[id];
    const title = `ZImage-Hosting Tracking - Image ${id}`;
    const filteredTracking = tracking.map(({ timestamp, referer, userAgent }) => ({
      timestamp,
      referer,
      userAgent
    }));
    const description = `This image has been viewed. Tracking information: ${JSON.stringify(filteredTracking)}`;

    const html = generateTrackingHtml(title, description, clicks, filteredTracking, id);

    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } else {
    const html = generateImageNotFoundHtml();
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/html');
    res.status(404).send(html);
  }
});

app.get(syn_config.preendpoint + 'content/raw/:id', async (req, res) => {
  const id = req.params.id;
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (images[id]) {
    // Check if the IP is the same as the one that created the image
    if (!images[id].tracking.find((entry) => entry.ip === ip)) {
      images[id].clicks++;
      images[id].tracking.push({
        ip,
        timestamp: new Date().toLocaleString(),
        referer: req.headers.referer || 'N/A',
        userAgent: req.headers['user-agent'] || 'N/A'
      });
    }

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


function generateTrackingHtml(title, description, clicks, tracking,id) {
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

  return html;
}

function generateImageNotFoundHtml() {
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
        <p>Please check the URL.</p>
      </body>
    </html>
  `;

  return html;
}

async function decryptImage(encryptedData) {
  // Decrypt the image using your decryption algorithm
  // This is just a placeholder
  const decryptedData = Buffer.from(encryptedData, 'base64');
  return decryptedData;
}

async function encryptImage(image) {
  // Encrypt the image using your encryption algorithm
  // This is just a placeholder
  const encryptedData = image.toString('base64');
  return encryptedData;
}


app.listen(3009, () => {
  console.log(`listening on 3009`)
})
