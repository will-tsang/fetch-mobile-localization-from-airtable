# Helper script to convert csv to i18n locale file

## Setup

1. Prepare Airtable API Key and Base Key

2. Install packages
    ```bash
    yarn
    ```

3. Prepare env variables
    ```bash
    cp .env.dist .env
    cp config.json.example config.json
    # fill in the env variables
    # Find Airtable Api Key in https://airtable.com/account
    # Find Base Key from the target base API document
    # Update projects setting in config.json
    ```

## Run script

```bash
update-locale.sh
```
