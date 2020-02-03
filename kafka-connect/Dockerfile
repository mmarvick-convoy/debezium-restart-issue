FROM confluentinc/cp-kafka-connect:5.4.0 AS build-plugins

RUN apt-get -y update \
    && apt-get -y install git maven \
    && apt-get clean

# Clone and build custom Debezium
RUN cd /home \
    && git clone --single-branch --branch "mwinst/debug_data_loss" https://github.com/convoyinc/debezium \
    && cd /home/debezium/ \
    && mvn clean install -DskipITs -DskipTests



FROM confluentinc/cp-kafka-connect:5.4.0

WORKDIR /

ENV CONNECT_PLUGIN_PATH="/usr/share/java"

# install tools: git, aws
RUN apt-get -y update \
    && apt-get -y install jq \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN printf "deb http://archive.debian.org/debian/ jessie main\ndeb-src http://archive.debian.org/debian/ jessie main\ndeb http://security.debian.org jessie/updates main\ndeb-src http://security.debian.org jessie/updates main" > /etc/apt/sources.list

# Add pre-built Debezium 0.95, including dependencies
RUN mkdir ${CONNECT_PLUGIN_PATH}/debezium-connector-postgres/ \
    && wget -P ${CONNECT_PLUGIN_PATH}/debezium-connector-postgres/ \
    https://repo1.maven.org/maven2/io/debezium/debezium-connector-postgres/0.9.5.Final/debezium-connector-postgres-0.9.5.Final-plugin.tar.gz \
    && tar -xzvf $CONNECT_PLUGIN_PATH/debezium-connector-postgres/debezium-connector-postgres-0.9.5.Final-plugin.tar.gz -C $CONNECT_PLUGIN_PATH/debezium-connector-postgres/

# Replace Debezium core and postgres connector with our custom build
RUN rm $CONNECT_PLUGIN_PATH/debezium-connector-postgres/debezium-connector-postgres/debezium-connector-postgres-0.9.5.Final.jar 
COPY --from=build-plugins /home/debezium/debezium-connector-postgres/target/debezium-connector-postgres-0.9.5.Final.jar $CONNECT_PLUGIN_PATH/debezium-connector-postgres/debezium-connector-postgres-0.9.5.Final.jar
RUN rm $CONNECT_PLUGIN_PATH/debezium-connector-postgres/debezium-connector-postgres/debezium-core-0.9.5.Final.jar
COPY --from=build-plugins /home/debezium/debezium-core/target/debezium-core-0.9.5.Final.jar $CONNECT_PLUGIN_PATH/debezium-connector-postgres/debezium-core-0.9.5.Final.jar

ENTRYPOINT ["/etc/confluent/docker/run"]
