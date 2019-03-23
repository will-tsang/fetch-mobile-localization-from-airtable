#!/usr/bin/env bash -ae

. .env

echo "Fetch Locales..."
yarn fetch-translation:ios
# yarn fetch-translation:android
yarn fetch-translation:watch

set +a

echo "Done!"
