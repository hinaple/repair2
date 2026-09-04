import { connect, type MqttClient } from "mqtt";
import { logger } from "../logs/logger";

type OnData = (topic: string, message: string) => unknown;
type OnConnect = () => unknown;

export default class MqttConnector {
  private client: MqttClient | null = null;
  constructor(
    private ondata: OnData,
    private onconnect: OnConnect
  ) {}
  async connect(url: string, topics: string[]) {
    if (this.client) this.client.end();

    this.client = connect(url);
    this.client.subscribe(topics);

    this.client.on("connect", () => {
      logger.warning("MQTT", `Connected to ${url}`);
      this.onconnect();
    });
    this.client.on("message", (topic, data) => {
      this.ondata(topic, data.toString());
    });
  }
  publish(topic: string, message: string) {
    if (!this.client) {
      logger.warning("MQTT", "No connection");
      return;
    }

    this.client.publish(topic, message);
  }
  disconnect() {
    if (!this.client) return;

    this.client.end();
    this.client = null;
  }
}
