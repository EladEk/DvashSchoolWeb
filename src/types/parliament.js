// Parliament types
export const ParliamentDate = {
  id: String,
  title: String,
  date: Date, // Firebase Timestamp
  isOpen: Boolean,
  createdAt: Date,
  createdByUid: String,
  createdByName: String,
}

export const ParliamentSubject = {
  id: String,
  title: String,
  description: String,
  createdByUid: String,
  createdByName: String,
  createdAt: Date,
  status: String, // 'pending' | 'approved' | 'rejected'
  statusReason: String,
  dateId: String,
  dateTitle: String,
  notesCount: Number,
}

export const ParliamentNote = {
  id: String,
  text: String,
  createdAt: Date,
  createdByUid: String,
  createdByName: String,
  subjectId: String,
}
