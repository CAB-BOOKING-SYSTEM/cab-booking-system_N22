const RIDE_STATES = {
  CREATED: "CREATED",
  MATCHING: "MATCHING",
  ASSIGNED: "ASSIGNED",
  PICKUP: "PICKUP",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
};

// valid transitions: current_state -> array of allowed next states
const TRANSITIONS = {
  [RIDE_STATES.CREATED]: [RIDE_STATES.MATCHING, RIDE_STATES.CANCELLED],
  [RIDE_STATES.MATCHING]: [RIDE_STATES.ASSIGNED, RIDE_STATES.CANCELLED],
  [RIDE_STATES.ASSIGNED]: [RIDE_STATES.PICKUP, RIDE_STATES.CANCELLED],
  [RIDE_STATES.PICKUP]: [RIDE_STATES.IN_PROGRESS, RIDE_STATES.CANCELLED],
  [RIDE_STATES.IN_PROGRESS]: [RIDE_STATES.COMPLETED, RIDE_STATES.CANCELLED],
  [RIDE_STATES.COMPLETED]: [RIDE_STATES.PAID],
  [RIDE_STATES.PAID]: [],
  [RIDE_STATES.CANCELLED]: [],
};

class RideStateMachine {
  static states = RIDE_STATES;

  /**
   * Check if the transition from currentStatus to nextStatus is valid.
   */
  static canTransition(currentStatus, nextStatus) {
    if (!this.states[nextStatus]) {
      return false; // Unknown next state
    }
    const allowedTransitions = TRANSITIONS[currentStatus];
    if (!allowedTransitions) {
      return false; // Unknown current state or terminal state
    }
    return allowedTransitions.includes(nextStatus);
  }
}

module.exports = RideStateMachine;
