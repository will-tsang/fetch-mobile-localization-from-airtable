#!/usr/bin/env bash -ae

. .env

echo "Fetch Locales..."
yarn fetch-translation:ios

set +a

echo "Done!"
