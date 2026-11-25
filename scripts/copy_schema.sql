# No connections must be active to the continuum_dev database before running this script
CREATE DATABASE continuum_dev TEMPLATE continuum;

UPDATE continuum_dev.public.workspaces SET user_id = 'NEW_USER_ID' WHERE user_id = 'ORIGINAL_USER_ID';
UPDATE continuum_dev.public.streams    SET user_id = 'NEW_USER_ID' WHERE user_id = 'ORIGINAL_USER_ID';
UPDATE continuum_dev.public.cards      SET user_id = 'NEW_USER_ID' WHERE user_id = 'ORIGINAL_USER_ID';
UPDATE continuum_dev.public.settings   SET user_id = 'NEW_USER_ID' WHERE user_id = 'ORIGINAL_USER_ID';