#!/bin/bash

set -e

$(aws ecr get-login --no-include-email --region us-east-1)
docker build -t remoteyear/ry-bot .
docker tag remoteyear/ry-bot:latest 177042114872.dkr.ecr.us-east-1.amazonaws.com/remoteyear/ry-bot:latest
docker push 177042114872.dkr.ecr.us-east-1.amazonaws.com/remoteyear/ry-bot:latest
