Changes needed :

1. Switch to live stripe credentials.
2. make the app use database for fetching products and there price_id(need to have a product and its price_id's which are different for per month/year)
3. use AWS Secret Manager parameter for managing secrets in your application
4. your ec2 instance will talk to IAM Role via AWS SDK to know the the secrets automatically.
5. apply caddy and does it hinder payments?
6. use terraform to write infrastructure as code so that no more manual AWS configuration
7. currently idk that i am handling new user via email and password. meed to check that.
8. what will the caddy/docker/docker-compose will like if this project with changes only to match production key and ready to deploy.
9. after done create a .md in docs explaining your views on this topics
