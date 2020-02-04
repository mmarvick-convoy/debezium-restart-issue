This is a set of repro steps to demonstrate that data replicated from Postgres to Kafka might get lost in certain circumstances, due to the ordering of Kafka Connect's `commit()` and `poll()` callbacks. It's most easily reproducible during a forced restart of Kafka Connect.


## Install Dependencies

This all assumes you're on OS X and have Homebrew installed for dep management. Things will still work if you're not, but you'll have to install the deps some other way.

### docker & docker-compose

Install here: https://docs.docker.com/compose/install/

### nodejs & yarn

One of our scripts is written in nodejs, and our packages are installed with yarn. You can install node and yarn together with:

```sh
brew install yarn
```

### psql

If you don't have psql, you can brew install either `libpq` or `postgresql`. The former includes psql and a few other utilities, without installing postgres.

Assuming you're just installing `libpq`, do the following:

```sh
brew install libpq
```

Once you install it (or if it's already installed but you can't execute it), you may need to add it to your path:

```sh
echo 'export PATH="/usr/local/opt/libpq/bin:$PATH"' >> ~/.bashrc
```

At which point, you can verify everything's working by running:

```sh
which psql
```

## Repro Steps

### Start Docker Compose (Tab 1)

Run the following, and leave it going:

```sh
docker-compose up
```

### Initialize the database (Tab 2)

This will create the table and the replication slot. Run:

```sh
./scripts/postgres-init.sh
```

If you get a permissions issue, run this first:
```sh
chmod u+x scripts/postgres-init.sh
```

### Create the Debezium connector

1. Open the Kafka Connect config in a new tab: http://localhost:8200/
2. Click "New"
3. Click "PostgresConnector"
4. Copy and paste the config from [postgres-connector.txt](postgres-connector.txt)
5. Click "Create"

### Generate data on loop (Tab 2)

Generate data in batches of 100 by running the data generation script. Items have an auto-incrementing id, which helps us detect rows that don't make it to Kafka.

Run:

```sh
./scripts/postgres-generate-data.sh
```

If you get a permissions issue, run this first:

```sh
chmod u+x scripts/postgres-generate-data.sh
```

### Run the script to check for missing data (Tab 3)

First, install dependencies

```sh
cd /scripts
yarn install
cd ..
```

Then, run:

```sh
node ./scripts/read_topics.js
```

You'll see each event get consumed in order (e.g. `Read: 1`, `Read: 2`, ...). When you see an array of items get printed out, that's an array of events that didn't make it into Kafka.

### Periodically stop / restart kafka connect (Tab 4)

It's useful to view this tab and Tab 3 (the script to check for missing data) side-by-side, so you can keep track of where Debezium is while doing stops and restarts.

Forcefully restart Kafka Connect by running:

```sh
docker-compose restart -t 0 kafka-connect
```

You can also stop it for a while before restarting by running:

```sh
docker-compose stop -t 0 kafka-connect
```

You can automate restarts on a cadence with:

```sh
for i in {1..50}; do docker-compose restart -t 0 kafka-connect; date ; sleep 45; done
```

Do enough restarts, and you'll eventually reproduce the case where a batch goes missing. It usually takes us ~10 - 50 restarts to reproduce. Some tips:
- Shut down Kafka Connect for a while so that it has a large amount of data to catch up on
- Do restarts of Kafka Connect while it's behind and hasn't fully caught up
    - If you're automatically restarting Kafka Connect on a loop, you may need to shorten the restart time or let some data seed first to achieve this. Keep an eye on the number of events consumed. We seed in batches of 100, so if the script is reporting a multiple of 100 events consumed, you've probably "caught up".
- When you do restarts, you'll notice Kafka Connect reprocesses some amount of data. Don't restart it again until it catches up with where you were before (since you know those values won't be caught missing). Leave it running long enough so that at least the LSN gets re-flushed (a few thousand values).
