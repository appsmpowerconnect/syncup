export interface TimeSlot {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface WeeklyAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  weeklyAvailability: WeeklyAvailability;
  timeZone: string;
  createdAt: any;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creatorName: string;
  members: string[]; // List of user UIDs
  memberDetails: {
    [uid: string]: {
      displayName: string;
      email: string;
      photoURL?: string;
    };
  };
  createdAt: any;
}

export interface EventProposal {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  description: string;
  proposedDate: string; // "YYYY-MM-DD"
  proposedTimeStart: string; // "HH:MM"
  proposedTimeEnd: string; // "HH:MM"
  status: 'pending' | 'confirmed' | 'cancelled';
  creatorId: string;
  creatorName: string;
  votes: {
    [uid: string]: 'yes' | 'no' | 'maybe';
  };
  createdAt: any;
}

export interface PersonalEvent {
  id: string;
  title: string;
  description: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  userId: string;
  groupId?: string;
  createdAt: any;
}
