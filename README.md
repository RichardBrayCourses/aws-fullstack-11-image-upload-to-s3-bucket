# To Run This Application

## 0. Install flyway

On a mac

```
brew install flyway
brew install --cask pgadmin4
```

On windows

```
winget install Flyway.Flyway
winget install --id PostgreSQL.pgAdmin --source winget

```

## 1. Install pnpm libraries

```
pnpm install
```

## 2. Bootstrap the CDK (if not already bootstrapped)

```
pnpm bootstrap-up
```

Note that there is also a bootstrap-down command to remove the bootstrap: this should only be done if all CloudFormation stacks have been deleted first.

## 3. Deploy cognito

Deploy cognito with the CDK

```
pnpm deploy-cognito
```

## 4. Cognito Configuration

The Cognito domain and client ID are automatically fetched from the API server at runtime.
The API server retrieves these values from AWS Systems Manager Parameter Store (SSM).
No manual configuration is needed in the UI - the UI will call the `/v1/config` endpoint to get the Cognito configuration.

If you need to configure the API server URL, you can set `VITE_API_BASE_URL` in `ui/.env` (defaults to `http://localhost:3001`).

## 6. Create a valid hosted zone

- purchase a registered domain
- create a Route 53 Hosted Zone in AWS
- Note the hosted zone DNS servers
- update the registered domain with the hosted zone DNS servers

## 7. Update the file deployment/.env

Update the values in the files as follows

```
# cloudfront bucket name : must be unique across the whole of AWS
CDK_UI_BUCKETNAME=rbt-uptickart-ui-bucket

# images bucket name : must be unique across the whole of AWS
CDK_IMAGES_BUCKET_NAME=rbt-uptickart-images-bucket

# System Name : can be anything
CDK_UPTICK_SYSTEM_NAME=uptickart

# domain name : your registered domain name (without www. or any other prefix)
CDK_UPTICK_DOMAIN_NAME=uptickart.com

# Zone name : get this from the details of the zone you created above
CDK_UPTICK_ZONE_NAME=uptickart.com

# Zone ID : get this from the details of the zone you created above
CDK_UPTICK_ZONE_ID=Z0562538GJBWB6YZ60GX
```

## 8 Deploy cloudfront

```
pnpm deploy-ui-cloudfront
```

## 9. Deploy UI into cloudfront

```
pnpm deploy-ui
```

## 10. Run Application from Cloudfront

Go to the browser and type in your registered domain prefixed by www.

```
www.uptickart.com
```

## 11. Build and Run the UI locally

```bash
pnpm dev
```
