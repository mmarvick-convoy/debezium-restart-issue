#!/bin/bash

while :
do
  values=""
  batch_size=100

  for i in $( seq 1 $batch_size )
  do
    value="('a')"
    if [ "$i" -eq $batch_size ]; then
      values="$values$value"
    else
      values="$values$value, "
    fi
  done

  psql -p 5422 -U postgres -d "debezium" -c "INSERT INTO data (text) VALUES $values"
done
