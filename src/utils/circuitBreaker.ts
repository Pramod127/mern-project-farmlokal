export type CircuitBreakerOptions = {
  failuresThreshold: number;
  windowSeconds: number;
  cooldownSeconds: number;
};

type CircuitState = "closed" | "open" | "half_open";

type FailureEvent = {
  at: number;
};

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures: FailureEvent[] = [];
  private openedAt: number | null = null;

  constructor(private options: CircuitBreakerOptions) {}

  isOpen() {
    if (this.state !== "open") return false;
    if (!this.openedAt) return true;

    const elapsed = Date.now() - this.openedAt;
    if (elapsed > this.options.cooldownSeconds * 1000) {
      this.state = "half_open";
      return false;
    }

    return true;
  }

  recordSuccess() {
    this.failures = [];
    this.state = "closed";
    this.openedAt = null;
  }

  recordFailure() {
    const cutoff = Date.now() - this.options.windowSeconds * 1000;
    this.failures = this.failures.filter((f) => f.at > cutoff);
    this.failures.push({ at: Date.now() });

    if (this.failures.length >= this.options.failuresThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }
}
