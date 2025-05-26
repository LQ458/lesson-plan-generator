// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'mistake_record.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class MistakeRecordAdapter extends TypeAdapter<MistakeRecord> {
  @override
  final int typeId = 2;

  @override
  MistakeRecord read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return MistakeRecord(
      id: fields[0] as String,
      studentName: fields[1] as String,
      subject: fields[2] as String,
      questionContent: fields[3] as String,
      correctAnswer: fields[4] as String,
      studentAnswer: fields[5] as String,
      knowledgePoint: fields[6] as String,
      difficulty: fields[7] as String,
      recordedAt: fields[8] as DateTime,
      isResolved: fields[9] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, MistakeRecord obj) {
    writer
      ..writeByte(10)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.studentName)
      ..writeByte(2)
      ..write(obj.subject)
      ..writeByte(3)
      ..write(obj.questionContent)
      ..writeByte(4)
      ..write(obj.correctAnswer)
      ..writeByte(5)
      ..write(obj.studentAnswer)
      ..writeByte(6)
      ..write(obj.knowledgePoint)
      ..writeByte(7)
      ..write(obj.difficulty)
      ..writeByte(8)
      ..write(obj.recordedAt)
      ..writeByte(9)
      ..write(obj.isResolved);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MistakeRecordAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
