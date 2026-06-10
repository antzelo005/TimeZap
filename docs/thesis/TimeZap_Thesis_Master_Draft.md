# Σχεδίαση και υλοποίηση πληροφοριακού συστήματος διαχείρισης εργασιών και συνηθειών (Task & Habit Management Information System)

**Έργο:** TimeZap
**Φοιτητής:** Angelo Bordeianu
**Επιβλέπων:** Ευθύμιος Αλέπης
**Έκδοση:** Master Draft για επεξεργασία και τελική μορφοποίηση

## Πίνακας περιεχομένων

[Να ενημερωθεί αυτόματα στο Microsoft Word ή να δημιουργηθεί στην τελική Markdown έκδοση.]

## 1. Εξώφυλλο / Στοιχεία εργασίας

Τίτλος πτυχιακής εργασίας: Σχεδίαση και υλοποίηση πληροφοριακού συστήματος διαχείρισης εργασιών και συνηθειών (Task & Habit Management Information System).

Όνομα εφαρμογής / έργου: TimeZap.

Ονοματεπώνυμο φοιτητή: Angelo Bordeianu.

Επιβλέπων καθηγητής: Ευθύμιος Αλέπης.

Τμήμα / Πανεπιστήμιο: [Συμπλήρωση από τον φοιτητή].

Ακαδημαϊκό έτος: [Συμπλήρωση από τον φοιτητή].

Το παρόν αρχείο αποτελεί master draft. Δεν είναι τελικό ακαδημαϊκό κείμενο, αλλά συγκεντρώνει τεχνικό και θεωρητικό υλικό που μπορεί να επεξεργαστεί, να εμπλουτιστεί με βιβλιογραφία και να μορφοποιηθεί για την τελική υποβολή.

[Πίνακας περιεχομένων: να δημιουργηθεί/ενημερωθεί στο Microsoft Word.]

## 2. Περίληψη

Η παρούσα πτυχιακή εργασία αφορά τη σχεδίαση και υλοποίηση του TimeZap, ενός πληροφοριακού συστήματος διαχείρισης εργασιών και συνηθειών. Το σύστημα στοχεύει να βοηθήσει τον χρήστη να οργανώνει καθημερινές υποχρεώσεις, να παρακολουθεί επαναλαμβανόμενες δραστηριότητες, να βλέπει την πρόοδό του και να λαμβάνει υπενθυμίσεις μέσα από μία ενιαία εφαρμογή.

Το πρόβλημα που αντιμετωπίζεται είναι η διάσπαση της προσωπικής οργάνωσης σε διαφορετικά εργαλεία και σημειώσεις. Οι εργασίες έχουν προθεσμίες, ώρες, καταστάσεις και πιθανή διάρκεια πολλών ημερών, ενώ οι συνήθειες έχουν επαναληπτικό χαρακτήρα και χρειάζονται καταγραφή σε βάθος χρόνου. Το TimeZap ενώνει αυτές τις δύο έννοιες σε ένα σύστημα με κοινό dashboard, ημερολόγιο, ρυθμίσεις και notification center.

Η υλοποίηση έγινε ως full-stack εφαρμογή. Το frontend αναπτύχθηκε με Expo, React Native, React Native Web και TypeScript, ώστε να λειτουργεί σε web και Android. Το backend αναπτύχθηκε με Node.js και Express.js, ενώ η αποθήκευση γίνεται σε PostgreSQL. Η αυθεντικοποίηση βασίζεται σε JWT και οι κωδικοί αποθηκεύονται ως bcrypt hashes.

Το τελικό αποτέλεσμα είναι ένα λειτουργικό V1 σύστημα με εγγραφή/σύνδεση, εργασίες, συνήθειες, dashboard, ημερολόγιο, ρυθμίσεις, θεματική εμφάνιση, τοπικοποίηση, SVG icon system και backend notification center. Η εργασία αναγνωρίζει περιορισμούς όπως η απουσία Google Calendar sync, server push notifications, app store deployment και πλήρους automated test suite.

## 3. Abstract

This thesis material presents the design and implementation of TimeZap, a task and habit management information system. The system aims to help users organize daily tasks, track recurring habits, view progress, and manage reminders through a unified application.

TimeZap is implemented as a full-stack system. The frontend uses Expo, React Native, React Native Web, and TypeScript, while the backend uses Node.js, Express.js, and PostgreSQL. Authentication is based on JSON Web Tokens, and passwords are stored as bcrypt hashes rather than plain text.

The main features include user registration and login, task management, multi-day tasks, habit tracking, recurrence rules, habit logs, streak calculation, dashboard summaries, monthly and daily calendar views, settings, localization, themes, and a backend-backed notification center. Native local notifications are supported only on compatible Android builds when permissions and user settings allow it.

The result is a functional V1 information system suitable for a thesis project. Future work includes remote push notifications, Google Calendar integration, production deployment, automated testing, and a more advanced recurrence engine.

## 4. Εισαγωγή

Η διαχείριση εργασιών και συνηθειών αποτελεί βασικό μέρος της καθημερινής οργάνωσης. Σε προσωπικό, ακαδημαϊκό και επαγγελματικό επίπεδο, ο χρήστης χρειάζεται να θυμάται υποχρεώσεις, προθεσμίες, δραστηριότητες που επαναλαμβάνονται και στόχους που εξελίσσονται με την πάροδο του χρόνου.

Τα συστήματα παραγωγικότητας μειώνουν το γνωστικό φορτίο του χρήστη. Αντί ο χρήστης να θυμάται κάθε υποχρέωση, το σύστημα αποθηκεύει, οργανώνει, εμφανίζει και υπενθυμίζει την πληροφορία. Ένα τέτοιο σύστημα είναι χρήσιμο όταν συνδυάζει λίστες, ημερομηνίες, επανάληψη, ολοκλήρωση, πρόοδο και ημερολογιακή προβολή.

Το TimeZap σχεδιάστηκε ως πρακτική υλοποίηση αυτής της λογικής. Ο στόχος δεν ήταν ένα υπερβολικά σύνθετο εμπορικό προϊόν, αλλά ένα καθαρό και ολοκληρωμένο V1 πληροφοριακό σύστημα για πτυχιακή εργασία. Η εφαρμογή καλύπτει αυθεντικοποίηση, εργασίες, συνήθειες, dashboard, calendar, settings, localization, themes και notifications.

Το πεδίο της εργασίας περιλαμβάνει backend, frontend, βάση δεδομένων, REST API, τεκμηρίωση και χειροκίνητες δοκιμές. Δεν περιλαμβάνει production deployment, Google Calendar integration, remote push notifications ή πλήρη αυτοματοποιημένη δοκιμαστική υποδομή.

Η δομή του κειμένου ξεκινά από την ανάλυση προβλήματος και τις απαιτήσεις, συνεχίζει με τεχνολογίες και αρχιτεκτονική, και στη συνέχεια παρουσιάζει τη βάση, το backend, το frontend, τις επιμέρους ενότητες, τις ειδοποιήσεις, τις δοκιμές, τους περιορισμούς, τις μελλοντικές επεκτάσεις και τα συμπεράσματα.

## 5. Ανάλυση προβλήματος

Οι χρήστες που οργανώνουν εργασίες και συνήθειες συχνά χρησιμοποιούν διαφορετικές εφαρμογές ή σημειώσεις. Αυτό οδηγεί σε αποσπασματική πληροφορία: μία εργασία μπορεί να βρίσκεται σε μία λίστα, μία συνήθεια σε άλλη εφαρμογή και μία υπενθύμιση σε ξεχωριστό ημερολόγιο.

Οι εργασίες και οι συνήθειες δεν έχουν την ίδια φύση. Μία εργασία ολοκληρώνεται συνήθως μία φορά και μπορεί να έχει συγκεκριμένη ημερομηνία, ώρα ή διάρκεια πολλών ημερών. Μία συνήθεια είναι επαναλαμβανόμενη και χρειάζεται καταγραφή ολοκλήρωσης ανά ημερομηνία. Η ενιαία αλλά διακριτή μοντελοποίηση αυτών των εννοιών είναι βασική ανάγκη.

Οι υπενθυμίσεις είναι επίσης σημαντικές. Για τις εργασίες απαιτείται ειδοποίηση πριν την έναρξη και προειδοποιήσεις πριν την καθυστέρηση. Για τις συνήθειες απαιτείται πιο επαναλαμβανόμενη υπενθύμιση. Το TimeZap υλοποιεί backend records για notifications ώστε το κέντρο ειδοποιήσεων να μην εξαρτάται αποκλειστικά από τη συσκευή.

Η ανάγκη ημερολογιακής επισκόπησης προκύπτει επειδή ο χρήστης θέλει να βλέπει πότε συμβαίνουν εργασίες και πότε καταγράφονται συνήθειες. Η μηνιαία και ημερήσια προβολή βοηθά στην κατανόηση της κατανομής της δραστηριότητας.

Ένα custom πληροφοριακό σύστημα έχει νόημα για πτυχιακή εργασία επειδή επιτρέπει έλεγχο όλης της στοίβας: schema, API, authentication, frontend state, UI, reminders και documentation. Το έργο δεν περιορίζεται σε απλή λίστα, αλλά δείχνει πλήρη κύκλο υλοποίησης.

## 6. Στόχοι της εφαρμογής

Οι στόχοι του TimeZap ορίστηκαν με κριτήριο την πρακτικότητα ενός V1 συστήματος. Η εφαρμογή έπρεπε να είναι αρκετά πλήρης ώστε να καλύπτει πραγματικές ροές χρήστη και αρκετά απλή ώστε να παραμένει κατανοητή για πτυχιακή εργασία.

- Διαχείριση εργασιών με δημιουργία, επεξεργασία, μετακίνηση, ολοκλήρωση, ακύρωση και διαγραφή.
- Υποστήριξη εργασιών μίας ημέρας, πολλών ημερών, all-day και timed tasks.
- Διαχείριση συνηθειών με κανόνες επανάληψης, καταγραφή και streaks.
- Προβολή προόδου μέσω dashboard και weekly progress.
- Ημερολόγιο μήνα και λεπτομέρειες ημέρας.
- Κέντρο ειδοποιήσεων με unread/read κατάσταση.
- Τοπικές Android ειδοποιήσεις όπου υποστηρίζονται.
- Ρυθμίσεις theme, language, notifications, default view, week start και time format.
- Υποστήριξη Αγγλικών, Ελληνικών και Ρουμανικών.
- Κοινή βάση frontend για web και Android.
- Καθαρό UI με mobile-first λογική και χαμηλό γνωστικό φορτίο.

Οι στόχοι αυτοί οδήγησαν σε αρχιτεκτονική όπου το backend είναι υπεύθυνο για persistence, validation, authentication και notification records, ενώ το frontend είναι υπεύθυνο για εμπειρία χρήστη, platform differences και native local scheduling όπου επιτρέπεται.

## 7. Απαιτήσεις συστήματος

### 7.1 Λειτουργικές απαιτήσεις

- Εγγραφή και σύνδεση χρήστη.
- JWT authentication σε protected endpoints.
- Ενημέρωση profile και αλλαγή password.
- CRUD εργασιών, ολοκλήρωση, ακύρωση και διαγραφή.
- Υποστήριξη multi-day tasks μέσω end_date.
- Υποστήριξη due/start/end time και all-day tasks.
- Υπολογισμός overdue με περίοδο χάριτος μίας ώρας.
- CRUD συνηθειών και καταγραφή ολοκλήρωσης ανά ημερομηνία.
- Υποστήριξη recurrence rules και optional habit end_date.
- Υπολογισμός streaks και dashboard progress.
- Μηνιαία και ημερήσια calendar προβολή.
- Ρυθμίσεις theme, language, notifications, default view, week start και time format.
- Notification center με unread/read state.
- Web in-app notifications και Android local notifications όπου υποστηρίζονται.

Οι λειτουργικές απαιτήσεις συνδέονται με συγκεκριμένα endpoints και οθόνες. Για παράδειγμα, οι εργασίες χρησιμοποιούν /api/tasks και η κατάσταση ειδοποιήσεων χρησιμοποιεί /api/notifications και /api/notifications/unread-count.

### 7.2 Μη λειτουργικές απαιτήσεις

- Ευχρηστία και απλή ροή βασικών ενεργειών.
- Responsive συμπεριφορά σε web και Android.
- Συντηρησιμότητα μέσω διακριτών modules.
- Ασφάλεια με password hashing και protected routes.
- Ακεραιότητα δεδομένων μέσω foreign keys, constraints και indexes.
- Αξιοπιστία στη δημιουργία και ακύρωση notification records.
- Cross-platform λειτουργία με σαφείς διαφορές ανά πλατφόρμα.
- Υποστήριξη localization και themes.
- Τεκμηρίωση για thesis και μελλοντική συντήρηση.

Οι μη λειτουργικές απαιτήσεις δεν υλοποιούνται όλες με απόλυτα μετρήσιμο τρόπο στο V1, όμως καθοδηγούν τη δομή του συστήματος, την τεκμηρίωση, τις δοκιμές και τις επιλογές τεχνολογιών.

## 8. Τεχνολογίες που χρησιμοποιήθηκαν

### React Native

Framework για δημιουργία εφαρμογών με React components. Χρησιμοποιείται στις οθόνες και στα reusable components.

Στο TimeZap η τεχνολογία React Native χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

### Expo

Πλατφόρμα ανάπτυξης React Native εφαρμογών. Χρησιμοποιείται για web και Android execution και για notification-related δυνατότητες.

Στο TimeZap η τεχνολογία Expo χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

### React Native Web

Επιτρέπει την εκτέλεση React Native components σε browser. Έτσι το TimeZap έχει web έκδοση χωρίς ξεχωριστό web framework.

Στο TimeZap η τεχνολογία React Native Web χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

### TypeScript

Παρέχει static typing στο frontend, ειδικά στα API payloads και response models.

Στο TimeZap η τεχνολογία TypeScript χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

### Node.js

Runtime για το backend. Εκτελεί το Express server.

Στο TimeZap η τεχνολογία Node.js χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

### Express.js

Web framework για routes, middleware και controllers.

Στο TimeZap η τεχνολογία Express.js χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

### PostgreSQL

Σχεσιακή βάση δεδομένων για users, settings, tasks, habits, logs και notifications.

Στο TimeZap η τεχνολογία PostgreSQL χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

### JWT

Token-based authentication για protected API routes.

Στο TimeZap η τεχνολογία JWT χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

### bcrypt

Hashing κωδικών ώστε να μην αποθηκεύονται plain passwords.

Στο TimeZap η τεχνολογία bcrypt χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

### AsyncStorage

Local frontend storage για token, cached settings και native notification IDs.

Στο TimeZap η τεχνολογία AsyncStorage χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

### Expo Notifications

Χρησιμοποιείται για native local notifications όπου υποστηρίζεται. Δεν υλοποιεί remote push στο V1.

Στο TimeZap η τεχνολογία Expo Notifications χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

### Git/GitHub

Χρησιμοποιείται για version control και παρουσίαση repository.

Στο TimeZap η τεχνολογία Git/GitHub χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

### Android Emulator

Χρησιμοποιείται για δοκιμή Android συμπεριφοράς με API URL 10.0.2.2.

Στο TimeZap η τεχνολογία Android Emulator χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

### Theme/styling architecture

Χρώματα, spacing, dark/light/system theme και shared components.

Στο TimeZap η τεχνολογία Theme/styling architecture χρησιμοποιείται με πρακτικό στόχο: να υποστηρίζει το V1 χωρίς υπερβολική πολυπλοκότητα. Η επιλογή αξιολογήθηκε με βάση τη συμβατότητα με web/Android, τη συντηρησιμότητα και την ευκολία τεκμηρίωσης.

## 9. Αρχιτεκτονική συστήματος

Το TimeZap έχει αρχιτεκτονική frontend-backend-database. Το frontend είναι Expo React Native εφαρμογή, το backend είναι Express REST API και η βάση είναι PostgreSQL. Η επικοινωνία γίνεται με HTTP/JSON και τα protected endpoints απαιτούν JWT.

[Screenshot/Diagram: High-level system architecture]

[Screenshot/Diagram: Frontend-backend-database communication]

### Frontend layer

Το frontend περιλαμβάνει api wrappers, components, context providers, i18n, navigation, screens, services, storage, theme και types. Η εκκίνηση γίνεται μέσω App, SafeAreaProvider, AuthProvider, SettingsProvider και NavigationContainer.

### Backend layer

Το backend περιλαμβάνει app.js, server.js, config/db.js, routes, controllers, middleware και validators. Το app.js ορίζει CORS, JSON parsing, health endpoints, route mounting, 404 handling και error middleware.

### Database layer

Η PostgreSQL αποθηκεύει όλα τα μόνιμα δεδομένα. Το schema χρησιμοποιεί BIGSERIAL/BIGINT IDs, foreign keys, constraints και indexes.

### API communication

Το frontend API client επιλέγει base URL ανά πλατφόρμα. Στο web χρησιμοποιείται localhost. Στο Android emulator χρησιμοποιείται 10.0.2.2 επειδή το localhost του emulator δεν δείχνει στον Windows host.

### Authentication flow

Μετά το login/register το backend επιστρέφει JWT, το οποίο αποθηκεύεται στο AsyncStorage. Στην εκκίνηση η εφαρμογή καλεί /api/auth/me για token restoration.

### Notification/reminder flow

Τα notification records δημιουργούνται στο backend και χρησιμοποιούνται από το notification center. Το frontend προγραμματίζει native local notifications μόνο όταν η πλατφόρμα το υποστηρίζει και το notifications_enabled είναι ενεργό.

### Web vs Android differences

Το web υποστηρίζει in-app notification center αλλά όχι native scheduling. Το Android emulator χρησιμοποιεί το ίδιο backend data model, αλλά native local notifications απαιτούν περιβάλλον όπου το expo-notifications είναι διαθέσιμο εκτός Expo Go περιορισμών.

## 10. Σχεδίαση βάσης δεδομένων

Η βάση δεδομένων σχεδιάστηκε με σαφείς οντότητες και σχέσεις. Όλα τα βασικά IDs είναι BIGSERIAL/BIGINT. Οι χρήστες συνδέονται με τις εργασίες, τις συνήθειες, τις καταγραφές, τις ρυθμίσεις και τις ειδοποιήσεις τους.

[Screenshot: PostgreSQL ERD / database diagram]

| Πίνακας | Σκοπός | Σημαντικά πεδία | Σχέσεις/σημειώσεις |
| --- | --- | --- | --- |
| users | Αποθήκευση χρηστών και βασικών στοιχείων λογαριασμού. | user_id, email, password_hash, display_name, timezone, language, is_active, created_at, updated_at | Συνδέεται με user_settings, tasks, habits, habit_logs και notifications. Το password_hash είναι bcrypt hash και όχι απλός κωδικός. |
| user_settings | Αποθήκευση προσωπικών ρυθμίσεων χρήστη. | setting_id, user_id, theme, notifications_enabled, default_view, week_starts_on, time_format | Έχει μοναδική σχέση με users μέσω user_id και διαγράφεται με cascade. |
| tasks | Αποθήκευση εργασιών. | task_id, user_id, title, description, due_date, end_date, due_time, start_time, end_time, status, is_all_day, reminder_enabled, completed_at, emoji, color | Υποστηρίζει εργασίες μίας ή πολλών ημερών και συνδέεται λογικά με notification records. |
| habits | Αποθήκευση συνηθειών. | habit_id, user_id, title, description, start_date, end_date, start_time, end_time, reminder_enabled, reminder_time, status, emoji, color | Υποστηρίζει ενεργό διάστημα με start_date/end_date και συνδέεται με κανόνες, logs και ειδοποιήσεις. |
| habit_rules | Αποθήκευση κανόνων επανάληψης. | rule_id, habit_id, recurrence_type, interval_value, target_count, target_period, week_start, is_active | Υποστηρίζει daily, specific_weekdays, every_n_days, x_times_per_week και x_times_per_month. |
| habit_rule_days | Αποθήκευση επιλεγμένων ημερών κανόνων. | rule_day_id, rule_id, day_of_week, day_of_month | Χρησιμοποιείται από recurrence rules που χρειάζονται συγκεκριμένες ημέρες. |
| habit_logs | Αποθήκευση ολοκληρώσεων συνηθειών ανά ημερομηνία. | habit_log_id, habit_id, user_id, log_date, completed_count, target_count_snapshot, status, completed_at | Τροφοδοτεί dashboard, calendar και streak calculation. |
| notifications | Αποθήκευση ειδοποιήσεων και reminder records. | notification_id, user_id, related_type, related_id, kind, title, body, scheduled_for, occurrence_date, status, read_at | Αποτελεί source of truth για το in-app notification center. Τα native notification IDs αποθηκεύονται μόνο στο frontend AsyncStorage. |

Η ύπαρξη end_date σε tasks και habits επιτρέπει multi-day υποστήριξη χωρίς διπλοποίηση records. Ο πίνακας notifications αποθηκεύει τόσο μελλοντικές υπενθυμίσεις όσο και records που εμφανίζονται στο in-app notification center.

## 11. Backend implementation

Το backend υλοποιείται ως Express εφαρμογή με καθαρή οργάνωση σε routes και controllers. Το app.js συνδέει τα modules /api/auth, /api/tasks, /api/habits, /api/dashboard, /api/calendar, /api/settings και /api/notifications.

Το server.js φορτώνει dotenv, εκτελεί ensureRuntimeSchema και ξεκινά τον server. Η runtime schema προετοιμασία είναι χρήσιμη για τοπικό V1 development, αλλά δεν αντικαθιστά ένα πλήρες production migration system.

Το config/db.js χρησιμοποιεί pg Pool και μεταβλητές περιβάλλοντος DB_HOST, DB_PORT, DB_NAME, DB_USER και DB_PASSWORD. Στο παρόν έγγραφο δεν καταγράφονται πραγματικές τιμές .env.

### Middleware

Το auth middleware ελέγχει Bearer token και επαληθεύει το JWT. Το error middleware επιστρέφει ενιαίο JSON σφάλμα με error και message.

### Auth module

Το auth module περιλαμβάνει register, login, me, updateProfile και changePassword. Το register δημιουργεί user και default settings μέσα σε transaction. Το login συγκρίνει bcrypt hash.

### Settings module

Το settings module διαχειρίζεται theme, notifications_enabled, default_view, week_starts_on, time_format, timezone και language.

### Tasks module

Το tasks module υλοποιεί CRUD, complete και cancel. Δημιουργεί και ακυρώνει notification records με βάση reminder_enabled και task lifecycle.

### Habits module

Το habits module διαχειρίζεται habits, rules, rule days, logs και streaks. Η δημιουργία/ενημέρωση χρησιμοποιεί transactions.

### Dashboard module

Το dashboard module επιστρέφει σημερινά tasks, habits, counts και current_streak.

### Calendar module

Το calendar module παρέχει monthly και daily views. Για multi-day tasks χρησιμοποιείται generate_series.

### Notifications module

Το notifications module δημιουργεί reminder records, υπολογίζει unread count, ενημερώνει read_at και ακυρώνει scheduled records.

## 12. API documentation summary

Ο παρακάτω πίνακας συνοψίζει τα endpoints του backend. Τα περισσότερα απαιτούν Authorization Bearer token. Δεν παρατίθενται πραγματικά tokens ή credentials.

| Module | Method | Endpoint | Purpose | Auth | Notes |
| --- | --- | --- | --- | --- | --- |
| Auth | POST | /api/auth/register | Εγγραφή χρήστη και δημιουργία default settings. | Όχι | Hash κωδικού με bcrypt. |
| Auth | POST | /api/auth/login | Σύνδεση χρήστη και έκδοση JWT. | Όχι | Επιστρέφει token και user object. |
| Auth | GET | /api/auth/me | Ανάκτηση τρέχοντος χρήστη. | Ναι | Χρησιμοποιείται στο bootstrap. |
| Auth | PUT | /api/auth/profile | Ενημέρωση email/display_name. | Ναι | Επιστρέφει νέο token. |
| Auth | PUT | /api/auth/password | Αλλαγή κωδικού. | Ναι | Ελέγχει current_password. |
| Settings | GET | /api/settings | Ανάκτηση ρυθμίσεων. | Ναι | Συνδυάζει user_settings και users. |
| Settings | PUT | /api/settings | Ενημέρωση ρυθμίσεων. | Ναι | Theme, language, notifications, default view, week start, time format. |
| Tasks | GET | /api/tasks | Λίστα εργασιών. | Ναι | Υποστηρίζει status, date, from, to. |
| Tasks | GET | /api/tasks/:id | Ανάκτηση εργασίας. | Ναι | Ελέγχεται ownership. |
| Tasks | POST | /api/tasks | Δημιουργία εργασίας. | Ναι | Δημιουργεί reminder records όταν χρειάζεται. |
| Tasks | PUT | /api/tasks/:id | Ενημέρωση εργασίας. | Ναι | Ακυρώνει παλιές ειδοποιήσεις και δημιουργεί νέες. |
| Tasks | PATCH | /api/tasks/:id/complete | Ολοκλήρωση εργασίας. | Ναι | Ακυρώνει future related notifications. |
| Tasks | PATCH | /api/tasks/:id/cancel | Ακύρωση εργασίας. | Ναι | Ορίζει status cancelled. |
| Tasks | DELETE | /api/tasks/:id | Διαγραφή εργασίας. | Ναι | Ακυρώνει related notifications. |
| Habits | GET | /api/habits | Λίστα συνηθειών. | Ναι | Επιστρέφει active rule. |
| Habits | GET | /api/habits/:id | Ανάκτηση συνήθειας. | Ναι | Περιλαμβάνει rule/days. |
| Habits | POST | /api/habits | Δημιουργία συνήθειας. | Ναι | Δημιουργεί habit και habit_rule. |
| Habits | PUT | /api/habits/:id | Ενημέρωση συνήθειας. | Ναι | Ενημερώνει habit/rule/days. |
| Habits | DELETE | /api/habits/:id | Διαγραφή συνήθειας. | Ναι | Ακυρώνει related notifications. |
| Habits | POST | /api/habits/:id/log | Καταγραφή ολοκλήρωσης. | Ναι | Αποτρέπει duplicate logs. |
| Habits | DELETE | /api/habits/:id/log/:date | Διαγραφή log. | Ναι | Αφαιρεί completion για ημερομηνία. |
| Habits | GET | /api/habits/:id/streak | Υπολογισμός streak. | Ναι | Βασίζεται στα habit_logs. |
| Calendar | GET | /api/calendar/month | Μηνιαία προβολή. | Ναι | Παράμετροι year/month. |
| Calendar | GET | /api/calendar/day | Λεπτομέρειες ημέρας. | Ναι | Παράμετρος date. |
| Dashboard | GET | /api/dashboard/today | Σύνοψη σημερινής ημέρας. | Ναι | Tasks, habits, current_streak. |
| Notifications | GET | /api/notifications | Λίστα ειδοποιήσεων. | Ναι | Υποστηρίζει unread/status. |
| Notifications | GET | /api/notifications/unread-count | Πλήθος unread. | Ναι | Τροφοδοτεί red dot/bell. |
| Notifications | PATCH | /api/notifications/read-all | Mark all as read. | Ναι | Ενημερώνει read_at. |
| Notifications | PATCH | /api/notifications/:id/read | Mark one as read. | Ναι | Ενημερώνει read_at. |
| Notifications | PATCH | /api/notifications/:id/cancel | Ακύρωση ειδοποίησης. | Ναι | Ορίζει status cancelled. |
| Notifications | DELETE | /api/notifications/:id | Διαγραφή ειδοποίησης. | Ναι | Αφαιρεί record. |

## 13. Frontend implementation

Το frontend βρίσκεται στο frontend/src και οργανώνεται σε api, components, context, i18n, navigation, screens, services, storage, theme και types. Αυτή η δομή βοηθά στη διατήρηση καθαρών ορίων ανάμεσα σε UI, API communication, global state και platform services.

### Expo app structure

Το src/App.tsx τυλίγει την εφαρμογή με SafeAreaProvider, AuthProvider και SettingsProvider. Το AppContent ρυθμίζει NavigationContainer, StatusBar και notification reconciliation.

### React Navigation

Το AppNavigator χρησιμοποιεί AuthStack για Login/Register και MainTabs για Dashboard, Tasks, Habits, Calendar και Account.

### Screens

Οι οθόνες Login, Register, Dashboard, Tasks, Habits, Calendar και Account αντιστοιχούν στις βασικές ροές χρήστη.

### API layer

Ο apiClient προσθέτει headers, token, JSON parsing και error handling. Τα api modules παρέχουν typed functions ανά backend module.

### Contexts

Το AuthContext διαχειρίζεται token/user/session. Το SettingsContext διαχειρίζεται ρυθμίσεις, local cache και optimistic update.

### Theme και localization

Το theme layer υποστηρίζει light, dark και system. Το i18n υποστηρίζει English, Greek και Romanian.

### Reusable components

Τα AppButton, AppInput, DateField, TimeField, FormModal, FloatingActionButton, EmptyState, SectionCard, StatCard, StreakBadge, IconColorPicker και NotificationBell μειώνουν τη διπλοποίηση.

### SVG icon system

Το TimeZapIcon και το react-native-svg δίνουν κοινό icon system για web και Android.

### Notification scheduling service

Το services/notifications.ts ελέγχει availability, permissions, Android channel, schedule/cancel και AsyncStorage native IDs.

## 14. Task management module

Η ενότητα εργασιών καλύπτει δημιουργία, επεξεργασία, μετακίνηση, reschedule, ολοκλήρωση, ακύρωση και διαγραφή. Η φόρμα εργασίας μετατρέπεται σε CreateTaskPayload με title, description, due_date, end_date, start_time, end_time, due_time, is_all_day, reminder_enabled, emoji και color.

Οι multi-day tasks υλοποιούνται με due_date και end_date. Η εργασία εμφανίζεται σε φίλτρα και calendar days όταν η ημερομηνία βρίσκεται στο διάστημα due_date έως COALESCE(end_date, due_date). Έτσι αποφεύγεται η αποθήκευση πολλών records για μία εργασία.

Η ολοκλήρωση ορίζει status completed και completed_at. Η διαγραφή αφαιρεί την εργασία. Η ακύρωση ορίζει status cancelled. Και στις τρεις περιπτώσεις ακυρώνονται οι σχετικές scheduled notifications.

Η overdue λογική βασίζεται σε ώρα λήξης ή διαθέσιμη scheduled ώρα και περίοδο χάριτος 60 λεπτών. Για all-day tasks χρησιμοποιείται η αρχή της επόμενης ημέρας.

Οι task reminders δημιουργούν standard reminder 30 λεπτά πριν από την έναρξη και overdue warnings 30/15/5 λεπτά πριν από το grace deadline. Τα reminders που θα ήταν στο παρελθόν δεν δημιουργούνται.

Στο dashboard, οι εργασίες συνεισφέρουν σε completed/total counts, ενώ στο calendar εμφανίζονται στις ημερομηνίες που καλύπτουν. Η οθόνη Tasks επιτρέπει pending, overdue και completed history προβολές.

## 15. Habit management module

Η ενότητα συνηθειών διαφέρει από τις εργασίες επειδή μία συνήθεια δεν ολοκληρώνεται μία φορά συνολικά, αλλά καταγράφεται ανά ημερομηνία. Το TimeZap διαχωρίζει τον ορισμό της συνήθειας από τα habit_logs.

Η δημιουργία habit αποθηκεύει row στον πίνακα habits και active rule στον πίνακα habit_rules. Όπου χρειάζεται, αποθηκεύονται ημέρες στον habit_rule_days. Τα recurrence types είναι daily, specific_weekdays, every_n_days, x_times_per_week και x_times_per_month.

Η καταγραφή habit ελέγχει ότι η ημερομηνία είναι μέσα στο start_date/end_date και ότι δεν υπάρχει ήδη log. Μετά την καταγραφή ακυρώνονται remaining notifications της ίδιας habit/date.

Το streak calculation βασίζεται σε διαδοχικές ολοκληρώσεις. Daily και specific weekday habits έχουν πιο φυσική ημερήσια ακολουθία. Weekly/monthly habits δεν μετρώνται απλοϊκά στο κύριο streak γιατί ο στόχος τους δεν αντιστοιχεί πάντα σε συνεχόμενες ημέρες.

Οι habits με end_date εμφανίζονται μόνο μέχρι τη λήξη τους και δεν δημιουργούν reminders μετά από αυτή. Το schema υποστηρίζει active και archived status, ενώ πιο πλήρης archive/restore εμπειρία μπορεί να αποτελέσει μελλοντική βελτίωση.

## 16. Calendar module

Το calendar module παρέχει μηνιαία και ημερήσια οπτική. Η μηνιαία προβολή δείχνει tasks και completed habit log counts. Η ημερήσια προβολή δείχνει tasks ενεργές εκείνη την ημερομηνία και habits που αναμένονται.

Για multi-day tasks, το backend χρησιμοποιεί PostgreSQL generate_series ώστε μία εργασία να εμφανίζεται σε κάθε ημέρα του διαστήματος. Αυτή η λύση κρατά τη βάση normalized.

Τα habit logs εμφανίζονται ως completion data. Η ημερήσια προβολή επιστρέφει completed boolean και log object όπου υπάρχει καταγραφή.

Το week_starts_on επηρεάζει τη διάταξη της εβδομάδας. Η τοπική διαχείριση YYYY-MM-DD strings βοηθά στην αποφυγή UTC bugs στο UI.

## 17. Dashboard module

Το dashboard λειτουργεί ως κεντρική εικόνα της ημέρας. Εμφανίζει task summary, habit summary, current streak, σημερινές λίστες και weekly progress.

Τα δεδομένα προέρχονται από /api/dashboard/today. Το backend φιλτράρει εργασίες και συνήθειες που είναι ενεργές σήμερα και διασταυρώνει habit_logs για completed_today.

Το StreakBadge και τα top summary chips δίνουν γρήγορη πληροφορία σε όλες τις authenticated οθόνες. Το dashboard δεν αντικαθιστά τις αναλυτικές οθόνες αλλά οδηγεί σε αυτές.

## 18. Notification and reminder system

Το σύστημα ειδοποιήσεων έχει δύο επίπεδα. Το πρώτο είναι το backend notification center, όπου ο πίνακας notifications αποτελεί source of truth. Το δεύτερο είναι το native local scheduling στο frontend, το οποίο λειτουργεί μόνο όπου το επιτρέπει η πλατφόρμα.

Κάθε notification record περιλαμβάνει related_type, related_id, kind, title, body, scheduled_for, occurrence_date, status και read_at. Μία ειδοποίηση θεωρείται unread όταν read_at IS NULL, status = scheduled και scheduled_for <= NOW().

Το notification center χρησιμοποιεί /api/notifications και /api/notifications/unread-count. Το mark one as read και mark all as read ενημερώνουν read_at. Το red dot/bell βασίζεται στο unread count.

Στο Android, όταν το expo-notifications είναι διαθέσιμο και τα permissions επιτρέπονται, το frontend προγραμματίζει native local notifications. Τα native IDs αποθηκεύονται σε AsyncStorage ανά χρήστη. Δεν αποθηκεύονται στο backend επειδή αφορούν συγκεκριμένη συσκευή.

Στο web δεν γίνεται native device scheduling. Παρόλα αυτά, το web έχει πλήρες in-app notification center επειδή διαβάζει backend records. Αυτό κάνει το σύστημα συνεπές ανάμεσα σε web και Android στο επίπεδο δεδομένων.

Δεν υπάρχουν push tokens, Firebase, APNs ή FCM. Δεν υλοποιούνται remote push notifications στο V1. Επίσης, πλούσιες native notification actions όπως mark task complete από notification θεωρούνται future work αν ζητηθούν.

Για εργασίες, το standard reminder δημιουργείται 30 λεπτά πριν από την ώρα έναρξης. Το grace deadline είναι η ώρα λήξης ή scheduled reference συν 60 λεπτά. Τα overdue warnings δημιουργούνται 30, 15 και 5 λεπτά πριν από το grace deadline.

Ο κύκλος ζωής task reminders είναι: create/update ακυρώνει παλιά scheduled records και δημιουργεί νέα, complete/cancel/delete ακυρώνει related scheduled records. Αυτό περιορίζει duplicates και stale reminders.

Για daily habits, το backend δημιουργεί reminder records για rolling window 14 ημερών. Παραλείπονται ημερομηνίες πριν από start_date, μετά από end_date και ημερομηνίες που έχουν ήδη logged completion.

Η ρύθμιση notifications_enabled επηρεάζει native scheduling στο frontend. Όταν είναι false, το frontend ακυρώνει αποθηκευμένα native IDs και δεν προγραμματίζει νέες device notifications. Τα backend records παραμένουν χρήσιμα για in-app ιστορικό.

Περιορισμός: Το Android Expo Go αντιμετωπίζεται ως native notification unavailable. Για πλήρη native local notification δοκιμή απαιτείται development ή production build.

## 19. Settings, themes και localization

Οι ρυθμίσεις αποθηκεύονται στο backend και cache-άρονται στο frontend. Το SettingsContext φορτώνει cached settings πριν ή παράλληλα με backend synchronization ώστε η εφαρμογή να ξεκινά με γνωστή εμφάνιση.

Το theme υποστηρίζει light, dark και system. Η επιλογή εφαρμόζεται στα reusable components και στις οθόνες μέσω theme hooks.

Το language υποστηρίζει English, Greek και Romanian. Αυτό επιτρέπει στοιχειώδη διεθνοποίηση και κάνει το σύστημα καταλληλότερο για διαφορετικούς χρήστες.

Το notifications_enabled ελέγχει native scheduling, το time_format ελέγχει 12h/24h εμφάνιση, το week_starts_on επηρεάζει ημερολόγιο και weekly progress, ενώ το default_view καθορίζει την αρχική καρτέλα.

## 20. UI/UX design

Το UI ακολουθεί mobile-first προσέγγιση. Η κάτω πλοήγηση δίνει πρόσβαση στις βασικές οθόνες, ενώ το floating action button δίνει γρήγορη δημιουργία εργασίας ή συνήθειας.

Η διεπαφή είναι productivity-focused. Δεν χρησιμοποιείται marketing-style landing page, αλλά πραγματική εφαρμογή πρώτης οθόνης. Τα στοιχεία είναι οργανωμένα γύρω από λίστες, ημερομηνίες, πρόοδο και ενέργειες.

Οι φόρμες εμφανίζονται σε modals/bottom sheets ώστε ο χρήστης να μην χάνει το context. Το icon/color picker επιτρέπει οπτική διαφοροποίηση χωρίς περιττή πολυπλοκότητα.

Το SVG icon system, το StreakBadge και το NotificationBell δημιουργούν συνεπή οπτική ταυτότητα. Τα empty states βοηθούν όταν δεν υπάρχουν δεδομένα.

Η προσβασιμότητα στο V1 καλύπτεται βασικά με μεγάλα touch targets και καθαρή αντίθεση. Πιο συστηματικός έλεγχος screen readers και keyboard navigation μπορεί να γίνει μελλοντικά.

## 21. Security considerations

Η ασφάλεια του V1 βασίζεται σε βασικές πρακτικές: bcrypt hashing, JWT protected routes και user-specific queries. Οι κωδικοί δεν αποθηκεύονται σε plain text.

Το auth middleware ελέγχει Bearer token και απορρίπτει missing, invalid ή expired token. Οι controllers φιλτράρουν με req.user.user_id ώστε ένας χρήστης να μην βλέπει δεδομένα άλλου χρήστη.

Το repository και η τεκμηρίωση δεν πρέπει να περιέχουν πραγματικές τιμές .env, passwords, tokens ή private credentials. Το παρόν master draft αναφέρει μόνο ονόματα μεταβλητών και τεχνικούς ρόλους.

Περιορισμοί ασφάλειας: δεν υπάρχει rate limiting, refresh token rotation, role-based access control, audit log ή formal penetration test. Αυτά ανήκουν σε production hardening και μελλοντική εργασία.

## 22. Testing and evaluation

Η δοκιμή του TimeZap τεκμηριώνεται κυρίως με manual testing checklist. Αυτό είναι περιορισμός του V1, αλλά καλύπτει τις κρίσιμες ροές για thesis αξιολόγηση.

[Screenshot: Backend health endpoint]

[Screenshot: db-health endpoint]

[Screenshot: Android emulator running TimeZap]

- Backend health checks: /api/health και /api/db-health.
- Auth tests: register, login, logout, token restoration, profile update, password change.
- Task tests: CRUD, completion, deletion, multi-day tasks, filters, reminder cancellation.
- Habit tests: CRUD, logging, duplicate prevention, streaks, end_date behavior.
- Calendar tests: month view, day details, multi-day task visibility, habit logs.
- Dashboard tests: counts, streak badge, weekly progress, refresh μετά από actions.
- Notification tests: unread count, read state, history, timing, cancellation.
- Settings tests: theme, language, notifications_enabled, default view, week start, time format.
- Web tests: localhost API και graceful degradation για native notifications.
- Android tests: 10.0.2.2 API και Expo Go limitations.
- Static checks: npm run typecheck και Expo web export όπου χρειάζεται.

Για τελική εργασία μπορούν να προστεθούν test run ημερομηνίες, πραγματικά screenshots και βασικά automated tests για validators, controllers και frontend utility logic.

## 23. Screenshots section

[Placeholder: Login screen]

Caption: “Εικόνα 1: Οθόνη σύνδεσης του TimeZap.”

[Placeholder: Dashboard dark mode]

Caption: “Εικόνα 2: Πίνακας ελέγχου σε σκοτεινό θέμα.”

[Placeholder: Dashboard light mode]

Caption: “Εικόνα 3: Πίνακας ελέγχου σε φωτεινό θέμα.”

[Placeholder: Tasks screen]

Caption: “Εικόνα 4: Οθόνη διαχείρισης εργασιών.”

[Placeholder: New Task modal]

Caption: “Εικόνα 5: Φόρμα δημιουργίας νέας εργασίας.”

[Placeholder: Habits screen]

Caption: “Εικόνα 6: Οθόνη διαχείρισης συνηθειών.”

[Placeholder: New Habit modal]

Caption: “Εικόνα 7: Φόρμα δημιουργίας συνήθειας.”

[Placeholder: Calendar monthly view]

Caption: “Εικόνα 8: Μηνιαία προβολή ημερολογίου.”

[Placeholder: Calendar day details]

Caption: “Εικόνα 9: Λεπτομέρειες επιλεγμένης ημέρας.”

[Placeholder: Account/settings screen]

Caption: “Εικόνα 10: Οθόνη ρυθμίσεων.”

[Placeholder: Notification center]

Caption: “Εικόνα 11: Κέντρο ειδοποιήσεων.”

[Placeholder: Android emulator running TimeZap]

Caption: “Εικόνα 12: Εκτέλεση στο Android Emulator.”

[Placeholder: Backend health endpoint]

Caption: “Εικόνα 13: Έλεγχος backend health.”

[Placeholder: db-health endpoint]

Caption: “Εικόνα 14: Έλεγχος σύνδεσης βάσης.”

[Placeholder: PostgreSQL ERD / database diagram]

Caption: “Εικόνα 15: Διάγραμμα βάσης δεδομένων.”

[Placeholder: GitHub repository]

Caption: “Εικόνα 16: Δομή repository.”

## 24. Περιορισμοί υλοποίησης

Το TimeZap V1 είναι λειτουργικό αλλά όχι πλήρως παραγωγικό προϊόν. Οι περιορισμοί καταγράφονται ώστε η εργασία να είναι ρεαλιστική και να μην υπερβάλλει για δυνατότητες που δεν υπάρχουν.

- Δεν υπάρχει Google Calendar synchronization.
- Δεν υπάρχουν server-side remote push notifications.
- Δεν υπάρχει Firebase, FCM ή APNs integration.
- Δεν έχει γίνει app store deployment.
- Οι native notification actions είναι μελλοντική εργασία.
- Το Android Expo Go έχει limitations για native notification scheduling.
- Δεν υπάρχει multi-device native notification sync πέρα από κοινό backend notification center.
- Το habit reminder scheduling είναι κυρίως για daily habits.
- Οι advanced recurrence περιπτώσεις έχουν περιορισμένη ωριμότητα σε reminders/analytics.
- Δεν υπάρχει πλήρες automated test suite.
- Δεν υπάρχει dedicated migration tool για παραγωγή.
- Δεν υπάρχουν συνεργατικές/shared tasks.

## 25. Μελλοντικές επεκτάσεις

Οι παρακάτω επεκτάσεις δεν είναι υλοποιημένες στο V1. Αποτελούν λογικά επόμενα βήματα αν το έργο συνεχιστεί μετά την πτυχιακή.

- Google Calendar integration.
- Remote push notifications.
- Production deployment και cloud database.
- Development build/EAS workflow.
- App store release.
- Advanced recurrence engine.
- Advanced analytics.
- Collaborative/shared tasks.
- Richer notification actions.
- Καλύτερο user profile management και password recovery.
- Automated tests και CI pipeline.
- Dedicated migrations.
- Accessibility review.

## 26. Συμπεράσματα

Το TimeZap υλοποιήθηκε ως ολοκληρωμένο V1 πληροφοριακό σύστημα διαχείρισης εργασιών και συνηθειών. Περιλαμβάνει backend, frontend, database schema, REST API, authentication, tasks, habits, dashboard, calendar, settings, localization, themes, notification center και platform-aware local notification scheduling.

Η ανάπτυξη ανέδειξε πρακτικά ζητήματα όπως ημερομηνίες, multi-day records, recurrence, read/unread state, native platform limitations και synchronization. Η επιλογή backend notification records ως source of truth βοήθησε ώστε web και Android να έχουν κοινή εικόνα ειδοποιήσεων.

Το σύστημα καλύπτει τους βασικούς στόχους της πτυχιακής εργασίας και παρέχει σταθερή βάση για περαιτέρω εξέλιξη. Για τελική υποβολή, το παρόν master draft μπορεί να εμπλουτιστεί με βιβλιογραφία, πραγματικά screenshots, διαγράμματα και αποτελέσματα δοκιμών.

## 27. Προτεινόμενη βιβλιογραφία / Πηγές προς συμπλήρωση

Δεν επινοούνται ψεύτικες βιβλιογραφικές εγγραφές. Η τελική εργασία πρέπει να συμπληρωθεί με πραγματικές πηγές και επίσημη μορφοποίηση παραπομπών.

- [Source needed: React Native documentation]
- [Source needed: Expo documentation]
- [Source needed: Expo Notifications documentation]
- [Source needed: React Navigation documentation]
- [Source needed: TypeScript documentation]
- [Source needed: Node.js documentation]
- [Source needed: Express.js documentation]
- [Source needed: PostgreSQL documentation]
- [Source needed: JSON Web Token documentation / RFC]
- [Source needed: bcrypt documentation or security reference]
- [Source needed: Software engineering / information systems reference]
- [Source needed: Human-computer interaction or usability reference]
- [Source needed: Habit formation / productivity reference]
- [Source needed: OWASP authentication/session management guidance]

## 28. Παράρτημα Α: Πηγές έργου που χρησιμοποιήθηκαν

Το παρόν master draft βασίστηκε στην υπάρχουσα τεκμηρίωση και στον πηγαίο κώδικα του repository. Οι παρακάτω πηγές επιθεωρήθηκαν πριν τη δημιουργία του εγγράφου:

- README.md
- docs/thesis-material.md
- docs/architecture.md
- docs/database.md
- docs/api.md
- docs/testing.md
- docs/screenshots.md
- backend/database/schema.sql
- backend/src/app.js
- backend/src/server.js
- backend/src/config/db.js
- backend/src/middleware/auth.middleware.js
- backend/src/middleware/error.middleware.js
- backend/src/controllers/*.js
- backend/src/routes/*.js
- frontend/src/screens/*.tsx
- frontend/src/api/*.ts
- frontend/src/types/*.ts
- frontend/src/context/*.tsx
- frontend/src/services/*.ts
- frontend/src/components/*.tsx
- frontend/src/components/icons/*.tsx
- backend/package.json
- frontend/package.json

Δεν συμπεριλήφθηκαν πραγματικές τιμές μεταβλητών περιβάλλοντος, κωδικοί, tokens ή private credentials.
