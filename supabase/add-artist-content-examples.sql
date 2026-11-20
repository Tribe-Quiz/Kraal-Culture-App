-- Examples for adding an artist's content. Run in Supabase > SQL Editor.
-- Change the artist name, then edit the values. Each block is independent.

-- 1. Store products (price in rand)
insert into public.artist_products (artist_id, title, description, category, price_zar, image_url, badge, in_stock, sort_order)
select id, 'Tour T-Shirt', 'Heavyweight cotton tee.', 'Apparel', 450, 'https://example.com/tee.jpg', 'New', true, 1
from public.artists where name = 'Ladysmith Black Mambazo';

-- 2. NFTs
insert into public.artist_nfts (artist_id, title, description, category, price_text, edition, image_url, sort_order)
select id, 'Album Cover Edition', 'Limited digital cover art.', 'Digital Art', '0.2 ETH', '1 of 10', 'https://example.com/nft.jpg', 1
from public.artists where name = 'Ladysmith Black Mambazo';

-- 3. Bioscope videos (YouTube links). kind decides the screen: 'Story' (left), 'Biography' (middle), 'Music video' (right).
--    The Biography screen also shows the artist's bio text from the artists table.
insert into public.artist_videos (artist_id, title, description, kind, video_url, sort_order)
select id, 'Live in Durban', 'Full live performance.', 'Music video', 'https://www.youtube.com/watch?v=VIDEO_ID', 1
from public.artists where name = 'Ladysmith Black Mambazo';

-- 4. Switch the buttons on for that artist once content is in
update public.artists set has_vr = true, has_bioscope = true where name = 'Ladysmith Black Mambazo';

-- 5. Optional: custom Home VR room image (same layout as the default: NFT frame left, store frame right)
update public.artists set vr_image_url = 'https://example.com/room.jpg' where name = 'Ladysmith Black Mambazo';
