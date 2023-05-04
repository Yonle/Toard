CREATE TABLE IF NOT EXISTS hello_there (ts INTEGER, t TEXT, d TEXT);
CREATE TABLE IF NOT EXISTS toard_api (ts INTEGER, t TEXT, d TEXT);

INSERT INTO hello_there VALUES
  (1639575229137, "Welcome to Toard", "Toard is a open source social Bulletin board, That used to discuss some stuff in real, internet, Music, or tech."),
  (1639575229137, "What is Toard?", "Toard is a Text only Bulletin board. And it's supposed to be anonymous for everyone. No registration is required, Javascript being optional frontend.

Toard is written in Javascript (NodeJS)"),
  (1639575229137, "Is Toard 4chan clone?", "4chan is a Image bulletin board, While Toard is a complete text-only bulletin board. Both is different when you see of how it works."),
  (1639575229137, "How to create a post?", "You see a button at the near top bar? Press it. You need to write your post title, and your description. Same as how do you reply to a post."),
  (1639575229137, "Where's the source code?", "https://github.com/Yonle/Toard"),
  (1639575229137, "Need API to build your own Toard Client?", "See /toard_api Endpoint"),
  (1639575229137, "Let's begin the journey!", 'Press the "Discover" button next to the "Home" button to see available threads in this server!');

INSERT INTO toard_api VALUES
  (1639575229137, "Toard API", "A short documentation of Toard API, Used for creating your own Toard Client, and etc. The API respond in JSON format, So you need to have a prepared JSON parser in your client."),
  (1639575229137, "/api/[id]", "A endpoint to fetch all Threads / Replies.

When you didn't provide a thread ID, The endpoint will returns all Threads with it's Replies.

Query:
- from <number>
  Trim post from specified number."),
  (1639575229137, "/create", "A endpoint to create a thread.
This Endpoint only work in POST method, and requires two POST data.

- t
  Post title

- d
  Post Description

Example POST Data:

t=Guys, How can i cook a pancake?
d=I would like to know how to cook a pancake. I found a post describing how to cook a pancake, But that never work."),
  (1639575229137, "/api/verify", 'A endpoint to get captcha challenge (GET only).

NOTE: You need to set `verify_sess` cookie when /post/reply or /create endpoint gives you `Set-Cookie`.

The following JSON data will be returned by this endpoint:

- q = Question (Usually ASCII)
- t = Tip. Could be "Solve the captcha." or "Solve the math."

To answer challenge, Send POST request to /verify endpoint with `answer` form.

When /verify endpoint redirect you to /verify again after POST, Request to this endpoint again to get new question until the redirection is no longer going to `/verify`.

You could fetch this endpoint again to get new question if the current question is not possible to answer.'),
  (1639575229137, "/[id]/reply", "Same as /create endpoint, But it's used for replying a thread.");
CREATE TABLE IF NOT EXISTS hello_there (ts INTEGER, t TEXT, d TEXT);
CREATE TABLE IF NOT EXISTS toard_api (ts INTEGER, t TEXT, d TEXT);

INSERT INTO hello_there VALUES
  (1639575229137, 'Welcome to Toard', 'Toard is a open source social Bulletin board, That used to discuss some stuff in real, internet, Music, or tech.'),
  (1639575229137, 'What is Toard?', 'Toard is a Text only Bulletin board. And it's supposed to be anonymous for everyone. No registration is required, Javascript being optional frontend.

Toard is written in Javascript (NodeJS)'),
  (1639575229137, 'Is Toard 4chan clone?', '4chan is a Image bulletin board, While Toard is a complete text-only bulletin board. Both is different when you see of how it works.'),
  (1639575229137, 'How to create a post?', 'You see a button at the near top bar? Press it. You need to write your post title, and your description. Same as how do you reply to a post.'),
  (1639575229137, 'Where's the source code?', 'https://github.com/Yonle/Toard'),
  (1639575229137, 'Need API to build your own Toard Client?', 'See /toard_api Endpoint'),
  (1639575229137, 'Let's begin the journey!', 'Press the 'Discover' button next to the 'Home' button to see available threads in this server!');

INSERT INTO toard_api VALUES
  (1639575229137, 'Toard API', 'A short documentation of Toard API, Used for creating your own Toard Client, and etc. The API respond in JSON format, So you need to have a prepared JSON parser in your client.'),
  (1639575229137, '/api/[id]', 'A endpoint to fetch all Threads / Replies.

When you didn't provide a thread ID, The endpoint will returns all Threads with it's Replies.

Query:
- from <number>
  Trim post from specified number.'),
  (1639575229137, '/create', 'A endpoint to create a thread.
This Endpoint only work in POST method, and requires two POST data.

- t
  Post title

- d
  Post Description

Example POST Data:

t=Guys, How can i cook a pancake?
d=I would like to know how to cook a pancake. I found a post describing how to cook a pancake, But that never work.'),
  (1639575229137, '/api/verify', 'A endpoint to get captcha challenge (GET only).

NOTE: You need to set `verify_sess` cookie when /post/reply or /create endpoint gives you `Set-Cookie`.

The following JSON data will be returned by this endpoint:

- q = Question (Usually ASCII)
- t = Tip. Could be 'Solve the captcha.' or 'Solve the math.'

To answer challenge, Send POST request to /verify endpoint with `answer` form.

When /verify endpoint redirect you to /verify again after POST, Request to this endpoint again to get new question until the redirection is no longer going to `/verify`.

You could fetch this endpoint again to get new question if the current question is not possible to answer.'),
  (1639575229137, '/[id]/reply', 'Same as /create endpoint, But it's used for replying a thread.');
