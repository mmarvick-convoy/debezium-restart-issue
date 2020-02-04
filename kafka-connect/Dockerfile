# Build Debezium in a Docker image
FROM confluentinc/cp-kafka-connect:5.4.0 AS build-plugins

## Install git
RUN apt-get -y update \
    && apt-get -y install git \
    && apt-get clean

## Install Maven
RUN wget http://us.mirrors.quenda.co/apache/maven/maven-3/3.6.3/binaries/apache-maven-3.6.3-bin.tar.gz -P /tmp \
    && tar xf /tmp/apache-maven-3.6.3-bin.tar.gz -C /opt 
ENV PATH="/opt/apache-maven-3.6.3/bin:${PATH}"

## Clone and build custom Debezium
RUN cd /home \
    && git clone --single-branch --branch "mwinst/extraLogsDataLoss" https://github.com/convoyinc/debezium \
    && cd /home/debezium/ \
    && mvn clean install -DskipITs -DskipTests


# Get the Confluent Kafka Connect image, and add Debezium
FROM confluentinc/cp-kafka-connect:5.4.0

WORKDIR /

ENV CONNECT_PLUGIN_PATH="/usr/share/java"

## Add pre-built Debezium 1.0, including dependencies (postgres driver, protobuf)
RUN mkdir ${CONNECT_PLUGIN_PATH}/debezium-connector-postgres/ \
    && wget -P ${CONNECT_PLUGIN_PATH}/debezium-connector-postgres/ \
    https://repo1.maven.org/maven2/io/debezium/debezium-connector-postgres/1.0.0.Final/debezium-connector-postgres-1.0.0.Final-plugin.tar.gz \
    && tar -xzvf $CONNECT_PLUGIN_PATH/debezium-connector-postgres/debezium-connector-postgres-1.0.0.Final-plugin.tar.gz -C $CONNECT_PLUGIN_PATH/debezium-connector-postgres/

## Replace Debezium core and postgres connector with our custom build
## NOTE: All that our custom build does is add some additional logging when polling and committing. If you don't care about this, then you can comment out these lines
## and skip the build step above.
RUN rm $CONNECT_PLUGIN_PATH/debezium-connector-postgres/debezium-connector-postgres/debezium-connector-postgres-1.0.0.Final.jar
COPY --from=build-plugins /home/debezium/debezium-connector-postgres/target/debezium-connector-postgres-1.1.0-SNAPSHOT.jar $CONNECT_PLUGIN_PATH/debezium-connector-postgres/debezium-connector-postgres-1.0.0.Final.jar
RUN rm $CONNECT_PLUGIN_PATH/debezium-connector-postgres/debezium-connector-postgres/debezium-core-1.0.0.Final.jar
COPY --from=build-plugins /home/debezium/debezium-core/target/debezium-core-1.1.0-SNAPSHOT.jar $CONNECT_PLUGIN_PATH/debezium-connector-postgres/debezium-core-1.0.0.Final.jar

ENTRYPOINT ["/etc/confluent/docker/run"]
