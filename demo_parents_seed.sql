-- Demo parents seed data (5 families)
BEGIN;

-- profiles
INSERT INTO profiles (id, role, linked_student_id) VALUES ('9de027f0-54af-42fd-8563-bc58d31e7fab', 'parent', NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO profiles (id, role, linked_student_id) VALUES ('10111018-6bc9-4fa7-a050-9b8a081a439d', 'parent', NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO profiles (id, role, linked_student_id) VALUES ('f4dad250-ac26-47b0-969b-9a317598b7e2', 'parent', NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO profiles (id, role, linked_student_id) VALUES ('936b5d92-9f81-46a2-8390-8b8d9dc2c3b5', 'parent', NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO profiles (id, role, linked_student_id) VALUES ('9d2fa784-38db-403b-b1db-8205b5a59257', 'parent', NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO profiles (id, role, linked_student_id) VALUES ('3c2a14a1-41e1-403e-b4d0-9934ee514545', 'parent', NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO profiles (id, role, linked_student_id) VALUES ('e0468ccf-dcdc-4804-81c7-9199c2717213', 'parent', NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO profiles (id, role, linked_student_id) VALUES ('cb4e6540-d816-4b7b-9753-e061344f3095', 'parent', NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO profiles (id, role, linked_student_id) VALUES ('0b2ae360-2a96-4002-a596-a27cfe5e370f', 'parent', NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO profiles (id, role, linked_student_id) VALUES ('7b765290-4d7d-4f87-a2c4-f067d3d1b1bd', 'parent', NULL) ON CONFLICT (id) DO NOTHING;

-- parents
INSERT INTO parents (parent_id, email, first_name, last_name, relationship, phone, created_at) VALUES ('9de027f0-54af-42fd-8563-bc58d31e7fab', 'family001.dad@demo.los', 'Dad', 'Family001', 'father', NULL, NULL) ON CONFLICT (parent_id) DO NOTHING;
INSERT INTO parents (parent_id, email, first_name, last_name, relationship, phone, created_at) VALUES ('10111018-6bc9-4fa7-a050-9b8a081a439d', 'family001.mom@demo.los', 'Mom', 'Family001', 'mother', NULL, NULL) ON CONFLICT (parent_id) DO NOTHING;
INSERT INTO parents (parent_id, email, first_name, last_name, relationship, phone, created_at) VALUES ('f4dad250-ac26-47b0-969b-9a317598b7e2', 'family002.dad@demo.los', 'Dad', 'Family002', 'father', NULL, NULL) ON CONFLICT (parent_id) DO NOTHING;
INSERT INTO parents (parent_id, email, first_name, last_name, relationship, phone, created_at) VALUES ('936b5d92-9f81-46a2-8390-8b8d9dc2c3b5', 'family002.mom@demo.los', 'Mom', 'Family002', 'mother', NULL, NULL) ON CONFLICT (parent_id) DO NOTHING;
INSERT INTO parents (parent_id, email, first_name, last_name, relationship, phone, created_at) VALUES ('9d2fa784-38db-403b-b1db-8205b5a59257', 'family003.dad@demo.los', 'Dad', 'Family003', 'father', NULL, NULL) ON CONFLICT (parent_id) DO NOTHING;
INSERT INTO parents (parent_id, email, first_name, last_name, relationship, phone, created_at) VALUES ('3c2a14a1-41e1-403e-b4d0-9934ee514545', 'family003.mom@demo.los', 'Mom', 'Family003', 'mother', NULL, NULL) ON CONFLICT (parent_id) DO NOTHING;
INSERT INTO parents (parent_id, email, first_name, last_name, relationship, phone, created_at) VALUES ('e0468ccf-dcdc-4804-81c7-9199c2717213', 'family004.dad@demo.los', 'Dad', 'Family004', 'father', NULL, NULL) ON CONFLICT (parent_id) DO NOTHING;
INSERT INTO parents (parent_id, email, first_name, last_name, relationship, phone, created_at) VALUES ('cb4e6540-d816-4b7b-9753-e061344f3095', 'family004.mom@demo.los', 'Mom', 'Family004', 'mother', NULL, NULL) ON CONFLICT (parent_id) DO NOTHING;
INSERT INTO parents (parent_id, email, first_name, last_name, relationship, phone, created_at) VALUES ('0b2ae360-2a96-4002-a596-a27cfe5e370f', 'family005.dad@demo.los', 'Dad', 'Family005', 'father', NULL, NULL) ON CONFLICT (parent_id) DO NOTHING;
INSERT INTO parents (parent_id, email, first_name, last_name, relationship, phone, created_at) VALUES ('7b765290-4d7d-4f87-a2c4-f067d3d1b1bd', 'family005.mom@demo.los', 'Mom', 'Family005', 'mother', NULL, NULL) ON CONFLICT (parent_id) DO NOTHING;

-- parent_students
INSERT INTO parent_students (parent_id, student_id) VALUES ('9de027f0-54af-42fd-8563-bc58d31e7fab', '992eeffd-2019-425e-aaf4-019efa3ced79') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('9de027f0-54af-42fd-8563-bc58d31e7fab', '3ab604c9-932f-4597-b081-ba42920f8314') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('9de027f0-54af-42fd-8563-bc58d31e7fab', '628dd85f-3843-452f-82b2-68401034f6e4') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('10111018-6bc9-4fa7-a050-9b8a081a439d', '992eeffd-2019-425e-aaf4-019efa3ced79') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('10111018-6bc9-4fa7-a050-9b8a081a439d', '3ab604c9-932f-4597-b081-ba42920f8314') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('10111018-6bc9-4fa7-a050-9b8a081a439d', '628dd85f-3843-452f-82b2-68401034f6e4') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('f4dad250-ac26-47b0-969b-9a317598b7e2', '64ee232f-b68d-4dda-b766-c70444c2db49') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('f4dad250-ac26-47b0-969b-9a317598b7e2', '95a8c492-b977-42ec-a8e9-7580efb9ea9b') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('936b5d92-9f81-46a2-8390-8b8d9dc2c3b5', '64ee232f-b68d-4dda-b766-c70444c2db49') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('936b5d92-9f81-46a2-8390-8b8d9dc2c3b5', '95a8c492-b977-42ec-a8e9-7580efb9ea9b') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('9d2fa784-38db-403b-b1db-8205b5a59257', '894de1d0-7b0e-4895-b1ae-f0d1ff2a8108') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('9d2fa784-38db-403b-b1db-8205b5a59257', '76b6a63e-b191-4443-8c04-9f2223497ab9') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('3c2a14a1-41e1-403e-b4d0-9934ee514545', '894de1d0-7b0e-4895-b1ae-f0d1ff2a8108') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('3c2a14a1-41e1-403e-b4d0-9934ee514545', '76b6a63e-b191-4443-8c04-9f2223497ab9') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('e0468ccf-dcdc-4804-81c7-9199c2717213', '4ce9311d-406a-4428-a3e8-6b5dc698dcfc') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('cb4e6540-d816-4b7b-9753-e061344f3095', '4ce9311d-406a-4428-a3e8-6b5dc698dcfc') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('0b2ae360-2a96-4002-a596-a27cfe5e370f', '9cfcf8b1-3380-47f7-816b-306c11510c6d') ON CONFLICT DO NOTHING;
INSERT INTO parent_students (parent_id, student_id) VALUES ('7b765290-4d7d-4f87-a2c4-f067d3d1b1bd', '9cfcf8b1-3380-47f7-816b-306c11510c6d') ON CONFLICT DO NOTHING;

COMMIT;
