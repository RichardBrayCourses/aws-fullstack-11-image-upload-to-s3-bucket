import {
  CfnManagedLoginBranding,
  OAuthScope,
  UserPool,
  CfnUserPoolGroup,
} from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

interface CognitoStackProps extends StackProps {
  systemName: string;
  postConfirmationLambda: NodejsFunction;
  domainName: string;
}

export class CognitoStack extends Stack {
  public readonly userPool: UserPool;

  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    const { systemName, postConfirmationLambda, domainName } = props;

    const wwwSubdomain = `https://www.${domainName}`;

    this.userPool = new UserPool(this, "uptick-userpool", {
      userPoolName: "uptick-userpool",
      removalPolicy: RemovalPolicy.DESTROY,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        phoneNumber: {
          required: false,
          mutable: true,
        },
      },
      selfSignUpEnabled: true,
      lambdaTriggers: {
        postConfirmation: postConfirmationLambda,
      },
    });

    const cognitoDomain = this.userPool.addDomain(`${systemName}-domain`, {
      cognitoDomain: {
        domainPrefix: systemName,
      },
      managedLoginVersion: 2,
    });

    const callbackUrls = [
      `http://localhost:3000/callback`,
      `${wwwSubdomain}/callback`,
    ];
    const logoutUrls = [`http://localhost:3000`, `${wwwSubdomain}`];

    const spaClient = this.userPool.addClient("uptick-spa-client", {
      userPoolClientName: "uptick-spa-client",
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [OAuthScope.OPENID, OAuthScope.EMAIL, OAuthScope.PHONE],
        callbackUrls,
        logoutUrls,
      },
      generateSecret: false,
    });

    new CfnManagedLoginBranding(
      this,
      "uptick-web-server-managed-login-branding",
      {
        userPoolId: this.userPool.userPoolId,
        clientId: spaClient.userPoolClientId,
        returnMergedResources: true,
        settings: {
          components: {
            primaryButton: {
              lightMode: {
                defaults: {
                  backgroundColor: "0972d3ff",
                  textColor: "ffffffff",
                },
                hover: {
                  backgroundColor: "033160ff",
                  textColor: "ffffffff",
                },
                active: {
                  backgroundColor: "033160ff",
                  textColor: "ffffffff",
                },
              },
              darkMode: {
                defaults: {
                  backgroundColor: "539fe5ff",
                  textColor: "000716ff",
                },
                hover: {
                  backgroundColor: "89bdeeff",
                  textColor: "000716ff",
                },
                active: {
                  backgroundColor: "539fe5ff",
                  textColor: "000716ff",
                },
              },
            },
            pageBackground: {
              lightMode: {
                color: "ffffffff",
              },
              darkMode: {
                color: "044444ff",
              },
              image: {
                enabled: false,
              },
            },
          },
          categories: {
            auth: {
              authMethodOrder: [
                [
                  {
                    display: "BUTTON",
                    type: "FEDERATED",
                  },
                  {
                    display: "INPUT",
                    type: "USERNAME_PASSWORD",
                  },
                ],
              ],
              federation: {
                interfaceStyle: "BUTTON_LIST",
                order: [],
              },
            },
            global: {
              colorSchemeMode: "DARK",
              pageHeader: {
                enabled: false,
              },
              pageFooter: {
                enabled: false,
              },
            },
          },
        },
      },
    );

    // Construct the full Cognito domain URL
    const cognitoDomainUrl = `https://${cognitoDomain.domainName}.auth.${this.region}.amazoncognito.com`;

    const clientId = spaClient.userPoolClientId;

    // Create administrators group
    new CfnUserPoolGroup(this, "AdministratorsGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "administrators",
      description: "Administrator users with elevated permissions",
    });

    new StringParameter(this, "cognito-domain-parameter", {
      parameterName: "/cognito/domain",
      stringValue: cognitoDomainUrl,
      description: "Cognito domain URL",
    });

    new StringParameter(this, "cognito-client-id-parameter", {
      parameterName: "/cognito/client-id",
      stringValue: clientId,
      description: "Cognito Client ID",
    });

    new StringParameter(this, "cognito-user-pool-id-parameter", {
      parameterName: "/cognito/user-pool-id",
      stringValue: this.userPool.userPoolId,
      description: "Cognito User Pool ID",
    });

    new CfnOutput(this, "cognito-domain-output", { value: cognitoDomainUrl });
    new CfnOutput(this, "cognito-client-id-output", { value: clientId });
  }
}
