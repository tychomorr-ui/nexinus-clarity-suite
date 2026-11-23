UPDATE `conversations`
SET `title` = REPLACE(REPLACE(REPLACE(REPLACE(`title`, 'Wraith', 'PAM'), 'Rafe', 'PAM'), 'Keira', 'PAM'), 'KIRA', 'PAM')
WHERE `title` REGEXP 'Rafe|Wraith|Keira|KIRA';
