
-- Remove non-India demo reports so the map is clean
DELETE FROM public.reports
WHERE description = 'Demo report seeded to showcase CivicPulse analytics. Location approximate.'
  AND NOT (latitude BETWEEN 6.5 AND 35.7 AND longitude BETWEEN 68 AND 97.5);

-- Seed ~50 India-only demo reports across major cities
WITH seed(title, issue_type, status, ward, department, latitude, longitude) AS (
  VALUES
    -- Delhi
    ('Pothole near Connaught Place','pothole','open','Ward 12','Roads',28.6315,77.2167),
    ('Overflowing bin at Karol Bagh','garbage','open','Ward 18','Sanitation',28.6519,77.1909),
    ('Streetlight out in Saket','streetlight','in_progress','Ward 45','Electrical',28.5245,77.2066),
    ('Water leak in Dwarka Sec 12','other','open','Ward 22','Water',28.5921,77.0460),
    ('Broken footpath in Rohini','pothole','resolved','Ward 9','Roads',28.7355,77.1259),
    ('Illegal dumping in Lajpat Nagar','garbage','in_progress','Ward 30','Sanitation',28.5677,77.2436),
    -- Mumbai
    ('Pothole on SV Road Bandra','pothole','open','Ward K/W','Roads',19.0596,72.8295),
    ('Garbage overflow Andheri East','garbage','open','Ward K/E','Sanitation',19.1197,72.8464),
    ('Streetlight failure Powai','streetlight','open','Ward S','Electrical',19.1176,72.9060),
    ('Signal not working Dadar','other','in_progress','Ward G/N','Traffic',19.0176,72.8562),
    ('Waterlogging Sion','other','resolved','Ward F/N','Drainage',19.0430,72.8615),
    ('Broken bench at Marine Drive','other','open','Ward A','Parks',18.9438,72.8235),
    -- Bengaluru
    ('Pothole on Outer Ring Road','pothole','open','Ward 150','Roads',12.9352,77.6245),
    ('Garbage pile Koramangala','garbage','in_progress','Ward 151','Sanitation',12.9352,77.6142),
    ('Streetlight out Indiranagar','streetlight','open','Ward 80','Electrical',12.9784,77.6408),
    ('Cracked road Whitefield','pothole','resolved','Ward 84','Roads',12.9698,77.7500),
    ('Open manhole HSR Layout','other','open','Ward 174','Drainage',12.9121,77.6446),
    -- Chennai
    ('Pothole near T Nagar','pothole','open','Ward 132','Roads',13.0418,80.2337),
    ('Garbage on Marina Beach Rd','garbage','open','Ward 60','Sanitation',13.0500,80.2824),
    ('Streetlight down Adyar','streetlight','in_progress','Ward 179','Electrical',13.0067,80.2570),
    ('Broken traffic signal Velachery','other','resolved','Ward 181','Traffic',12.9756,80.2200),
    -- Kolkata
    ('Pothole on Park Street','pothole','open','Ward 63','Roads',22.5535,88.3520),
    ('Garbage Salt Lake Sec V','garbage','in_progress','Ward 108','Sanitation',22.5760,88.4335),
    ('Streetlight out Howrah','streetlight','open','Ward 40','Electrical',22.5958,88.2636),
    ('Water leak Ballygunge','other','resolved','Ward 68','Water',22.5290,88.3660),
    -- Hyderabad
    ('Pothole in Gachibowli','pothole','open','Ward 95','Roads',17.4401,78.3489),
    ('Garbage HITEC City','garbage','open','Ward 96','Sanitation',17.4483,78.3915),
    ('Streetlight fault Banjara Hills','streetlight','in_progress','Ward 94','Electrical',17.4126,78.4353),
    ('Traffic light dead Ameerpet','other','open','Ward 97','Traffic',17.4374,78.4487),
    -- Pune
    ('Pothole on FC Road','pothole','open','Ward 8','Roads',18.5236,73.8449),
    ('Garbage overflow Hinjewadi','garbage','open','Ward 30','Sanitation',18.5913,73.7389),
    ('Streetlight out Kothrud','streetlight','resolved','Ward 25','Electrical',18.5074,73.8077),
    -- Ahmedabad
    ('Pothole SG Highway','pothole','open','Ward 45','Roads',23.0300,72.5100),
    ('Garbage near Sabarmati','garbage','in_progress','Ward 12','Sanitation',23.0733,72.5820),
    ('Streetlight Vastrapur','streetlight','open','Ward 33','Electrical',23.0395,72.5300),
    -- Jaipur
    ('Pothole on Tonk Road','pothole','open','Ward 55','Roads',26.8500,75.8000),
    ('Garbage in Malviya Nagar','garbage','open','Ward 60','Sanitation',26.8540,75.8221),
    ('Streetlight out C-Scheme','streetlight','in_progress','Ward 47','Electrical',26.9124,75.7873),
    -- Lucknow
    ('Pothole in Hazratganj','pothole','open','Ward 22','Roads',26.8467,80.9462),
    ('Garbage overflow Gomti Nagar','garbage','resolved','Ward 40','Sanitation',26.8500,81.0000),
    -- Chandigarh
    ('Broken road Sector 17','pothole','open','Ward 5','Roads',30.7410,76.7822),
    ('Streetlight down Sector 22','streetlight','open','Ward 8','Electrical',30.7295,76.7770),
    -- Bhopal
    ('Pothole MP Nagar','pothole','open','Ward 33','Roads',23.2330,77.4340),
    ('Garbage overflow New Market','garbage','in_progress','Ward 30','Sanitation',23.2350,77.4020),
    -- Kochi
    ('Pothole Marine Drive','pothole','open','Ward 21','Roads',9.9800,76.2830),
    ('Streetlight out Fort Kochi','streetlight','open','Ward 1','Electrical',9.9650,76.2420),
    -- Guwahati
    ('Waterlogging in Paltan Bazaar','other','open','Ward 15','Drainage',26.1830,91.7530),
    ('Garbage overflow Beltola','garbage','in_progress','Ward 32','Sanitation',26.1276,91.7972),
    -- Varanasi
    ('Pothole near Assi Ghat','pothole','open','Ward 18','Roads',25.2870,82.9990),
    ('Streetlight out Cantonment','streetlight','resolved','Ward 3','Electrical',25.3300,82.9870)
)
INSERT INTO public.reports
  (title, description, issue_type, status, ward, department, latitude, longitude, upvote_count, user_id, created_at)
SELECT
  s.title,
  'Demo report seeded to showcase CivicPulse analytics. Location approximate.',
  s.issue_type::text,
  s.status::text,
  s.ward,
  s.department,
  s.latitude,
  s.longitude,
  floor(random() * 25)::int,
  (SELECT user_id FROM public.reports WHERE user_id IS NOT NULL LIMIT 1),
  now() - (random() * interval '30 days')
FROM seed s;
