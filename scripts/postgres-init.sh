#!/bin/bash

psql -p 5422 -U postgres -c "CREATE DATABASE debezium"
psql -p 5422 -U postgres -d "debezium" -c "CREATE TABLE data (id serial, text text)"
psql -p 5422 -U postgres -d debezium -h localhost -c "select pg_create_physical_replication_slot('kafkadw');"
echo "Done"
