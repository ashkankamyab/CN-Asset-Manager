from django.contrib.auth.models import Group, User
from django.test import TestCase
from rest_framework.test import APIClient

from .models import UserProfile


class UserProfileModelTest(TestCase):
    def test_profile_auto_created_on_user_create(self):
        user = User.objects.create_user('testuser', 'test@example.com', 'pass')
        self.assertTrue(hasattr(user, 'profile'))
        self.assertEqual(user.profile.role, UserProfile.Role.READONLY)
        self.assertFalse(user.profile.is_superadmin)
        self.assertEqual(user.profile.auth_source, UserProfile.AuthSource.LOCAL)

    def test_is_admin_or_superadmin_property(self):
        admin = User.objects.create_user('admin1', password='pass')
        admin.profile.role = UserProfile.Role.ADMIN
        admin.profile.save()
        self.assertTrue(admin.profile.is_admin_or_superadmin)

        superadmin = User.objects.create_user('super1', password='pass')
        superadmin.profile.role = UserProfile.Role.SUPERADMIN
        superadmin.profile.save()
        self.assertTrue(superadmin.profile.is_admin_or_superadmin)

        readonly = User.objects.create_user('readonly1', password='pass')
        self.assertFalse(readonly.profile.is_admin_or_superadmin)

    def test_superadmin_cannot_be_deleted(self):
        user = User.objects.create_user('nodelete', password='pass')
        user.profile.is_superadmin = True
        user.profile.role = UserProfile.Role.SUPERADMIN
        user.profile.save()

        with self.assertRaises(PermissionError):
            user.delete()

    def test_regular_user_can_be_deleted(self):
        user = User.objects.create_user('candelete', password='pass')
        user.delete()
        self.assertFalse(User.objects.filter(username='candelete').exists())


class DataMigrationTest(TestCase):
    def test_superadmin_user_exists(self):
        user = User.objects.get(username='superadmin')
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertEqual(user.profile.role, UserProfile.Role.SUPERADMIN)
        self.assertTrue(user.profile.is_superadmin)

    def test_groups_exist(self):
        self.assertTrue(Group.objects.filter(name='admin').exists())
        self.assertTrue(Group.objects.filter(name='readonly').exists())

    def test_superadmin_can_login(self):
        self.assertTrue(
            self.client.login(username='superadmin', password='changeme')
        )


class AuthMeEndpointTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.superadmin = User.objects.get(username='superadmin')
        self.readonly_user = User.objects.create_user('reader', password='pass')
        self.admin_user = User.objects.create_user('admin', password='pass')
        self.admin_user.profile.role = UserProfile.Role.ADMIN
        self.admin_user.profile.save()

    def test_me_unauthenticated_returns_403(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 403)

    def test_me_returns_superadmin_info(self):
        self.client.force_authenticate(self.superadmin)
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['username'], 'superadmin')
        self.assertEqual(data['role'], 'superadmin')
        self.assertTrue(data['is_superadmin'])

    def test_me_returns_readonly_info(self):
        self.client.force_authenticate(self.readonly_user)
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['role'], 'readonly')
        self.assertFalse(data['is_superadmin'])

    def test_me_returns_admin_info(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['role'], 'admin')


class LogoutEndpointTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('logoutuser', password='pass')

    def test_logout_unauthenticated_returns_403(self):
        response = self.client.post('/api/auth/logout/')
        self.assertEqual(response.status_code, 403)

    def test_logout_authenticated_succeeds(self):
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/auth/logout/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['detail'], 'Logged out.')


class DRFPermissionsTest(TestCase):
    """Test that DRF endpoints enforce IsAdminOrReadOnly correctly."""

    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user('permadmin', password='pass')
        self.admin_user.profile.role = UserProfile.Role.ADMIN
        self.admin_user.profile.save()

        self.readonly_user = User.objects.create_user('permreader', password='pass')

    def test_unauthenticated_get_assets_returns_403(self):
        response = self.client.get('/api/assets/')
        self.assertEqual(response.status_code, 403)

    def test_readonly_get_assets_succeeds(self):
        self.client.force_authenticate(self.readonly_user)
        response = self.client.get('/api/assets/')
        self.assertEqual(response.status_code, 200)

    def test_readonly_post_assets_returns_403(self):
        self.client.force_authenticate(self.readonly_user)
        response = self.client.post('/api/assets/', {'name': 'test'}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_admin_post_assets_allowed(self):
        self.client.force_authenticate(self.admin_user)
        # Will fail validation (400), but should not be 403 — proves permission passed
        response = self.client.post('/api/assets/', {'name': 'test'}, format='json')
        self.assertNotEqual(response.status_code, 403)

    def test_readonly_cannot_trigger_discovery(self):
        self.client.force_authenticate(self.readonly_user)
        response = self.client.post('/api/discovery/trigger/', {}, format='json')
        self.assertEqual(response.status_code, 403)


class TemplateViewProtectionTest(TestCase):
    """Test that template views require login and redirect when unauthenticated.

    NOTE: Tests that render templates (status 200) are skipped due to a known
    Django 4.2 + Python 3.14 incompatibility in template context copying.
    The redirect (302) tests work because no template is rendered.
    """

    def test_dashboard_redirects_unauthenticated(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 302)
        self.assertIn('login', response.url)

    def test_asset_list_redirects_unauthenticated(self):
        response = self.client.get('/assets/')
        self.assertEqual(response.status_code, 302)

    def test_account_list_redirects_unauthenticated(self):
        response = self.client.get('/accounts/')
        self.assertEqual(response.status_code, 302)

    def test_discovery_jobs_redirects_unauthenticated(self):
        response = self.client.get('/discovery/jobs/')
        self.assertEqual(response.status_code, 302)

    def test_export_redirects_unauthenticated(self):
        response = self.client.get('/assets/export/csv/')
        self.assertEqual(response.status_code, 302)
        self.assertIn('login', response.url)

    def test_export_accessible_when_authenticated(self):
        # Export returns CSV (no template rendering), so it works fine
        self.client.login(username='superadmin', password='changeme')
        response = self.client.get('/assets/export/csv/')
        self.assertEqual(response.status_code, 200)

    def test_readonly_user_cannot_access_create_views(self):
        User.objects.create_user('viewreader', password='pass')
        self.client.login(username='viewreader', password='pass')

        # Asset add should return 403 (UserPassesTestMixin)
        response = self.client.get('/assets/add/')
        self.assertEqual(response.status_code, 403)

        # Account add
        response = self.client.get('/accounts/add/')
        self.assertEqual(response.status_code, 403)
