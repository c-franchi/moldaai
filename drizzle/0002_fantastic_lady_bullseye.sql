CREATE TABLE `item_personalizations` (
	`order_item_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`age` text DEFAULT '' NOT NULL,
	`object_key` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `item_personalizations_object_key_unique` ON `item_personalizations` (`object_key`);--> statement-breakpoint
CREATE TABLE `order_item_sources` (
	`order_item_id` text PRIMARY KEY NOT NULL,
	`source_key` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `product_personalization_sources` (
	`product_id` text PRIMARY KEY NOT NULL,
	`source_key` text NOT NULL,
	`source_revision` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TRIGGER capture_order_item_personalization_source AFTER INSERT ON order_items BEGIN
 INSERT OR IGNORE INTO order_item_sources(order_item_id,source_key,created_at)
 SELECT NEW.id,s.source_key,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM product_personalization_sources s WHERE s.product_id=NEW.product_id;
END;
--> statement-breakpoint
CREATE TRIGGER capture_existing_personalization_source AFTER INSERT ON product_personalization_sources BEGIN
 INSERT OR IGNORE INTO order_item_sources(order_item_id,source_key,created_at)
 SELECT i.id,NEW.source_key,strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM order_items i WHERE i.product_id=NEW.product_id;
END;
--> statement-breakpoint
INSERT OR IGNORE INTO product_personalization_sources(product_id,source_key,source_revision,created_at)
SELECT p.id,'studio-products/'||p.id||'/'||f.id||'-source.json',CAST(substr(p.id,instr(p.id,'-r')+2) AS INTEGER),p.updated_at
FROM products p JOIN product_files f ON f.product_id=p.id
WHERE p.id LIKE 'studio-%-r%' AND f.original_filename LIKE 'caixa-bala-molde-e-instrucoes-r%.pdf' AND f.is_active=1;
--> statement-breakpoint
UPDATE products SET description=replace(description,'O arquivo base é entregue sem nome e idade; a capa mostra uma sugestão de personalização. A personalização é preparada no Estúdio antes da entrega.','Após o pagamento confirmado, acesse Meus moldes, informe e confirme uma única vez o nome da criança e o complemento. Seu PDF personalizado será liberado para baixar novamente quando precisar. O nome Sophia da capa é apenas ilustrativo.'),short_description='PDF personalizado com o nome da criança, em A4, com guia de corte e montagem.',revision=revision+1
WHERE id IN (SELECT product_id FROM product_personalization_sources) AND description LIKE '%O arquivo base é entregue sem nome e idade;%';
