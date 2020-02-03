const minimist = require('minimist')
const { Kafka } = require('kafkajs')

/////////////////////////////////////////////////////////////////////////
// Script to read through messages in from a topic. Prints out "missing"
// messages - assumes that messages will be sequential based on "id"
// field.
// Command line options:
//   --topic : define which topic is of interest (default test_topic)
//   --from_beginning : define whether to read from the beginning
//                      (default true)
//   --broker_ip : IP/hostname of the kafka broker (default localhost)
//
// Based on scrips/kafka_util/topic_reader/topic_reader.js
/////////////////////////////////////////////////////////////////////////

const defaultTopic = 'postgres.public.data';
const consumerGroup = 'data-plat-test';

const getRandomNumber = () => Math.round(Math.random() * 100000)

async function createClient(brokerIp) {
  return new Kafka({
    brokers: [brokerIp + ':9092'],
    connectionTimeout: 3000,            
 });
}

function addMissingIds(id, maxSeen, missing) {
  if (id < maxSeen) {
    // If we thought it was missing before, make it no longer missing.
    const index = missing.indexOf(id);
    if (index != -1) {
      missing.splice(index, 1);
    } // else not missing - this is a duplicate
  } else if (id > maxSeen + 1) {
    // We have a gap. Add some missing ids.
    for (let i = maxSeen + 1; i < id; ++i) {
      missing.push(i);
    }
  }
}

async function run() {
  const args = minimist(process.argv.slice(2), {
    default: {
      topic: defaultTopic,
      from_beginning: true,
      broker_ip: "localhost",
    },
  });
  const topic = args.topic;
  let groupId = consumerGroup;
  if (args.from_beginning) {
    // This helps read from the true beginning of the topic.
    groupId += "-" + getRandomNumber();
  }

  const kafkaClient = await createClient(args.broker_ip);

  const eventConsumer = kafkaClient.consumer({ groupId });
  await eventConsumer.connect();
  await eventConsumer.subscribe({ topic, fromBeginning: args.from_beginning });

  const missing = [];
  let maxSeen = 0;
  await eventConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const messageValue = JSON.parse(message.value.toString());

      if (messageValue.id != null) {
        const id = parseInt(messageValue.id);
        console.log('Read: ' + id);
        addMissingIds(id, maxSeen, missing);
        maxSeen = Math.max(maxSeen, id);
      }
      if (missing.length > 0) {
        console.log(missing);
      }
    },
  });
  await new Promise(function(resolve, reject) {
      // Prevents the script from exiting, will run until killed with ctrl + C
  });
}

run().then(() => process.exit());