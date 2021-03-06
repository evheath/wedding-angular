// docs: https://firebase.google.com/docs/functions/firestore-events
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp(); // only needs to be done once (within any file)
const db = admin.firestore();
const storage = admin.storage();

export const onRsvpDocumentCreation = functions.firestore.document(`rsvp/{rsvpId}`).onCreate(async (snapshot, context) => {
  const incomingData = snapshot.data();
  const { attending, attendees, name } = incomingData;

  const aggRef = db.doc('aggregations/rsvp');
  const aggDoc = await aggRef.get();
  const aggData = aggDoc.data();
  let attendeeCount = 0;
  let rsvpCount = 0;
  let namesIn: string[] = [];
  let namesOut: string[] = [];
  if (aggData) {
    attendeeCount = aggData.attendeeCount;
    rsvpCount = aggData.rsvpCount;
    namesIn = aggData.namesIn;
    namesOut = aggData.namesOut;
  }

  const next = {
    rsvpCount: rsvpCount + 1,
    attendeeCount,
    namesIn,
    namesOut,
  };

  if (attending) {
    next.attendeeCount = attendeeCount + attendees;
    next.namesIn = [name, ...namesIn];
  } else {
    next.namesOut = [name, ...namesOut];
  }

  return aggRef.set(next, { merge: true });
});

export const onRsvpDocumentUpdate = functions.firestore.document(`rsvp/{rsvpId}`).onUpdate(async (snapshot, context) => {
  const incomingData = snapshot.after.data();
  const existingData = snapshot.before.data();

  // no meaningful change
  if (existingData.attending === incomingData.attending
    && existingData.attendees === incomingData.attendees
    && existingData.name === incomingData.name) {
    return null;
  }

  // there was a meaningful change, so we can start getting and setting data
  const aggRef = db.doc('aggregations/rsvp');
  const aggDoc = await aggRef.get();
  const aggData = aggDoc.data();
  let attendeeCount = 0;
  let namesIn: string[] = [];
  let namesOut: string[] = [];
  if (aggData) {
    attendeeCount = aggData.attendeeCount;
    namesIn = aggData.namesIn;
    namesOut = aggData.namesOut;
  }
  const next = {
    attendeeCount,
    namesIn,
    namesOut
  };

  // the name has changed
  const oldName: string = existingData.name;
  const newName: string = incomingData.name;
  if (oldName !== newName) {
    // they are yay
    if (existingData.attending) {
      const index = next.namesIn.indexOf(oldName);
      if (index > -1) {
        next.namesIn[index] = newName;
      }
    }
    // they are nay
    else {
      const index = next.namesOut.indexOf(oldName);
      if (index > -1) {
        next.namesOut[index] = newName;
      }
    }
  }

  // change from yay to nay
  if (existingData.attending === true && incomingData.attending === false) {
    // remove name from namesIn
    const index = next.namesIn.indexOf(incomingData.name);
    if (index > -1) {
      next.namesIn.splice(index, 1);
    }
    // add name to namesOut
    next.namesOut = [incomingData.name, ...next.namesOut];
    // subtract attendeeCount
    next.attendeeCount -= existingData.attendees;
  }

  // change from nay to yay
  if (existingData.attending === false && incomingData.attending === true) {
    // remove name from namesOut
    const index = next.namesOut.indexOf(incomingData.name);
    if (index > -1) {
      next.namesOut.splice(index, 1);
    }
    // add name to namesIn
    next.namesIn = [incomingData.name, ...next.namesIn];
    // add to attendeeCount
    next.attendeeCount += incomingData.attendees;
  }

  // already marked as attending, but a change in number of attendees
  if (existingData.attending && incomingData.attending && existingData.attendees !== incomingData.attendees) {
    next.attendeeCount -= existingData.attendees;
    next.attendeeCount += incomingData.attendees;
  }




  return aggRef.set(next, { merge: true });
});

export const onUploadDocumentDelete = functions.firestore.document(`uploads/{uploadId}`).onDelete(async (snapshot, context) => {
  const { path } = snapshot.data();
  return storage.bucket('gs://elliotandtina.appspot.com/').file(path).delete();
});
