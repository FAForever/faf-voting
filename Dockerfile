FROM node:alpine

ADD . /code
WORKDIR /code

RUN yarn install

CMD PORT=3000 node vote.js

EXPOSE 3000
