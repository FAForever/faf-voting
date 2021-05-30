#!/bin/bash
echo "RELEASE_VERSION=${GITHUB_REF#refs/*/}" >> $GITHUB_ENV
export IMAGE_TAG=faf-voting
export REPO=faforever/faf-voting
echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin
docker build -t ${IMAGE_TAG} .
docker tag ${IMAGE_TAG} ${REPO}:"${RELEASE_VERSION}"
docker tag ${IMAGE_TAG} ${REPO}:latest
docker push ${REPO}