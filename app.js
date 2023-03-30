const {OAuth2Client} = require('google-auth-library');
const http = require('http');
const url = require('url');
const open = require('open');
const destroyer = require('server-destroy');
const keys = require('./keys.json');


// Start by acquiring a pre-authenticated oAuth2 client.
async function main() {
  const oAuth2Client = await getAuthenticatedClient();
  getInfo(oAuth2Client)
}


// Create a new OAuth2Client, and go through the OAuth2 content workflow.  Return the full client to the callback.
function getAuthenticatedClient() {
  return new Promise((resolve, reject) => {
    // create an oAuth client to authorize the API call.  Secrets are kept in a `keys.json` file,
    // which should be downloaded from the Google Developers Console.
    const oAuth2Client = new OAuth2Client(
      keys.web.client_id,
      keys.web.client_secret,
      keys.web.redirect_uris[0]
    );
      const scope = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email' 
      ];
    // Generate the url that will be used for the consent dialog.
    const authorizeUrl = oAuth2Client.generateAuthUrl({
    //  access_type: 'offline',
      scope: scope
    });

    // Open an http server to accept the oauth callback. In this simple example, the
    // only request to our webserver is to /oauth2callback?code=<code>
    const server = http
      .createServer(async (req, res) => {
        try {
          if (req.url.indexOf('/thankyou') > -1) {
            // acquire the code from the querystring, and close the web server.
            const qs = new url.URL(req.url, 'http://localhost:3000')
              .searchParams;
            const code = qs.get('code');

            res.end(``)
            server.destroy();

            // Now that we have the code, use that to acquire tokens.
            const r = await oAuth2Client.getToken(code);
            // Make sure to set the credentials on the OAuth2 client.
            oAuth2Client.setCredentials(r.tokens);
            // console.info('Tokens acquired.');
             resolve(oAuth2Client);
          }
        } catch (e) {
          reject(e);
        }
      })
      .listen(3000, () => {
        // open the browser to the authorize url to start the workflow
        // open(authorizeUrl, {wait: false}).then(cp => cp.unref());
        open(authorizeUrl, {wait: true});
        
      });
    destroyer(server);
  });
}

async function getInfo(oAuth2Client) {
  const url = 'https://people.googleapis.com/v1/people/me?personFields=names,photos,emailAddresses';
  const info = await oAuth2Client.request({url});
  console.log("API response according to requested scope: ", info.data);
  let email, userName, photo;
  userName = info.data.names[0].displayName,
  photo = info.data.photos[0].url,
  email = info.data.emailAddresses[0].value

  return new Promise((resolve, reject) => {
    const server = http
      .createServer(async (req, res) => {
        try {
            res.end(`<!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>IAP+People API Test App</title>
              <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.2.1/css/bootstrap.min.css" 
            </head>
            <body>
              <div class="container">
                <div style="position: relative; margin-top: 10px;">
                  <img class="rounded-circle" id="avatar" src="${photo}" alt="ProfilePicture" />
                </div>
                <h2 id="heading" class="display-4 text-center py-1">IAP + google-auth-library (ver2)</h2>
                <p>Hello <strong>${userName}! </strong></p>
                <p>You email is <strong>${email}</strong></p>
              </div>
            </body>
            </html>`);
           // res.end(`Hi!`)
            server.destroy();

            resolve();
          // }
        } catch (e) {
          reject(e);
        }
      })
      .listen(3000, () => {
        open('http://localhost:3000/thankyou', {wait: true});
        
      });
    destroyer(server);
  });
}

main().catch(console.error);