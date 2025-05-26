// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'lesson_plan.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class LessonPlanAdapter extends TypeAdapter<LessonPlan> {
  @override
  final int typeId = 0;

  @override
  LessonPlan read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return LessonPlan(
      id: fields[0] as String,
      title: fields[1] as String,
      subject: fields[2] as String,
      grade: fields[3] as String,
      topic: fields[4] as String,
      content: fields[5] as String,
      createdAt: fields[6] as DateTime,
      updatedAt: fields[7] as DateTime,
    );
  }

  @override
  void write(BinaryWriter writer, LessonPlan obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.title)
      ..writeByte(2)
      ..write(obj.subject)
      ..writeByte(3)
      ..write(obj.grade)
      ..writeByte(4)
      ..write(obj.topic)
      ..writeByte(5)
      ..write(obj.content)
      ..writeByte(6)
      ..write(obj.createdAt)
      ..writeByte(7)
      ..write(obj.updatedAt);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is LessonPlanAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
