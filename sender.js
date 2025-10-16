const { Vonage } = require('@vonage/server-sdk')

const vonage = new Vonage({
  apiKey: "37fe6925",
  apiSecret: "Eg(y@tXmxQLWF7U" // if you want to manage your secret, please do so by visiting your API Settings page in your dashboard
})

const from = "Vonage APIs"
const to = "918328065633"
const text = 'A text message sent using the Vonage SMS API'

async function sendSMS() {
    await vonage.sms.send({to, from, text})
        .then(resp => { console.log('Message sent successfully'); console.log(resp); })
        .catch(err => { console.log('There was an error sending the messages.'); console.error(err); });
}

sendSMS();